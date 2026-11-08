//! MARGEN 1.12.1: backend local de escritorio.
//! Persistencia SQLite incremental por libro, carga bajo demanda, recuperación transaccional y medios por SHA256.
//! No expone acceso arbitrario al disco ni acepta rutas suministradas por la webview.
mod lexicon;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use regex::Regex;
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::Serialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Write;
use std::process::Command;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{path::BaseDirectory, Manager};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

type MResult<T> = Result<T, String>;

const MARGEN_VERSION:&str=env!("CARGO_PKG_VERSION");
const DB_SCHEMA_VERSION:i64=1110;
static PREVIOUS_UNCLEAN:OnceLock<bool>=OnceLock::new();

fn error<E: std::fmt::Display>(err: E) -> String { err.to_string() }
fn time() -> String {
    SystemTime::now().duration_since(UNIX_EPOCH)
        .unwrap_or_default().as_secs().to_string()
}
fn sha(data: &[u8]) -> String { format!("{:x}", Sha256::digest(data)) }

fn data_dir(app: &tauri::AppHandle) -> MResult<PathBuf> {
    let dir = app.path().app_data_dir().map_err(error)?;
    fs::create_dir_all(&dir).map_err(error)?;
    Ok(dir)
}
fn ensure_schema(db: &Connection) -> MResult<()> {
    db.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = FULL;
         PRAGMA foreign_keys = ON;
         PRAGMA temp_store = MEMORY;
         PRAGMA wal_autocheckpoint = 1000;
         CREATE TABLE IF NOT EXISTS revisions (
            id TEXT PRIMARY KEY CHECK(id IN ('workspace','recovery')),
            content TEXT NOT NULL,
            checksum TEXT NOT NULL,
            token TEXT NOT NULL,
            saved_at TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS quarantine (
            id TEXT PRIMARY KEY, content TEXT NOT NULL, checksum TEXT NOT NULL,
            token TEXT NOT NULL, quarantined_at TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS workspace_heads (
            slot TEXT PRIMARY KEY CHECK(slot IN ('workspace','recovery')),
            content TEXT NOT NULL,
            checksum TEXT NOT NULL,
            token TEXT NOT NULL,
            saved_at TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS book_versions (
            book_id TEXT NOT NULL,
            version_id TEXT NOT NULL,
            content TEXT NOT NULL,
            checksum TEXT NOT NULL,
            saved_at TEXT NOT NULL,
            PRIMARY KEY(book_id,version_id)
         );
         CREATE TABLE IF NOT EXISTS workspace_book_refs (
            slot TEXT NOT NULL CHECK(slot IN ('workspace','recovery')),
            position INTEGER NOT NULL,
            book_id TEXT NOT NULL,
            version_id TEXT NOT NULL,
            PRIMARY KEY(slot,position),
            UNIQUE(slot,book_id),
            FOREIGN KEY(book_id,version_id) REFERENCES book_versions(book_id,version_id)
         );
         CREATE INDEX IF NOT EXISTS idx_workspace_book_refs_version
            ON workspace_book_refs(book_id,version_id);
         CREATE TABLE IF NOT EXISTS book_summaries (
            book_id TEXT NOT NULL,
            version_id TEXT NOT NULL,
            summary TEXT NOT NULL,
            checksum TEXT NOT NULL,
            PRIMARY KEY(book_id,version_id),
            FOREIGN KEY(book_id,version_id) REFERENCES book_versions(book_id,version_id) ON DELETE CASCADE
         );
         CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            app_version TEXT NOT NULL,
            applied_at TEXT NOT NULL
         );"
    ).map_err(error)?;
    Ok(())
}
fn migrate_database(db:&Connection)->MResult<()> {
    let current:i64=db.query_row("PRAGMA user_version",[],|row|row.get(0)).map_err(error)?;
    if current>DB_SCHEMA_VERSION {
        return Err(format!("MARGEN_DATABASE_NEWER: la biblioteca requiere un MARGEN más reciente (esquema {current})"));
    }
    if current<DB_SCHEMA_VERSION {
        let saved_at=time();
        db.execute(
            "INSERT OR IGNORE INTO schema_migrations(version,app_version,applied_at) VALUES(?1,?2,?3)",
            params![DB_SCHEMA_VERSION,MARGEN_VERSION,saved_at]
        ).map_err(error)?;
        db.pragma_update(None,"user_version",DB_SCHEMA_VERSION).map_err(error)?;
    }
    db.execute(
        "INSERT INTO app_meta(key,value) VALUES('last_app_version',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [MARGEN_VERSION]
    ).map_err(error)?;
    Ok(())
}
fn connect(app: &tauri::AppHandle) -> MResult<Connection> {
    let path = data_dir(app)?.join("margen.sqlite3");
    let db = Connection::open(path).map_err(error)?;
    db.busy_timeout(Duration::from_secs(15)).map_err(error)?;
    ensure_schema(&db)?;
    migrate_database(&db)?;
    Ok(db)
}

// --- Formato monolítico 1.9.0: se conserva como legado y fuente de migración. ---
#[derive(Debug)]
struct Revision {
    content: String,
    checksum: String,
    token: String,
    saved_at: String,
}
fn fetch(db: &Connection, id: &str) -> MResult<Option<Revision>> {
    db.query_row(
        "SELECT content, checksum, token, saved_at FROM revisions WHERE id = ?1",
        [id],
        |row| Ok(Revision {
            content: row.get(0)?, checksum: row.get(1)?,
            token: row.get(2)?, saved_at: row.get(3)?,
        })
    ).optional().map_err(error)
}
fn valid_record(row: &Revision) -> bool {
    sha(row.content.as_bytes()) == row.checksum
        && serde_json::from_str::<Value>(&row.content).is_ok()
}
fn legacy_record_meta(row: &Revision) -> Value {
    json!({"token":row.token,"time":row.saved_at})
}

fn validate_book(book: &Value) -> MResult<()> {
    if book.get("id").and_then(Value::as_str).is_none()
        || book.get("name").and_then(Value::as_str).is_none()
        || !book.get("chapters").map(Value::is_array).unwrap_or(false)
        || !book.get("boards").map(Value::is_array).unwrap_or(false)
        || !book.get("notes").map(Value::is_array).unwrap_or(false) {
        return Err("MARGEN_SCHEMA: Estructura de libro incompleta".into());
    }
    Ok(())
}
fn validate_workspace(v: &Value) -> MResult<()> {
    if v.get("version").and_then(Value::as_i64) != Some(1) {
        return Err("MARGEN_SCHEMA: Formato de biblioteca no compatible".into());
    }
    let books = v.get("projects").and_then(Value::as_array)
        .ok_or_else(|| "MARGEN_SCHEMA: Falta la lista de libros".to_string())?;
    let mut ids = HashSet::new();
    for book in books {
        validate_book(book)?;
        let id = book.get("id").and_then(Value::as_str).unwrap();
        if !ids.insert(id.to_string()) {
            return Err("MARGEN_SCHEMA: Hay identificadores de libro duplicados".into());
        }
    }
    Ok(())
}
fn validate_root(v: &Value) -> MResult<()> {
    if v.get("version").and_then(Value::as_i64) != Some(1) {
        return Err("MARGEN_SCHEMA: Formato de biblioteca no compatible".into());
    }
    if let Some(projects) = v.get("projects") {
        if !projects.as_array().map(|x|x.is_empty()).unwrap_or(false) {
            return Err("MARGEN_SCHEMA: La cabecera incremental no puede contener libros".into());
        }
    }
    Ok(())
}
fn split_workspace(mut value: Value) -> MResult<(Value, Vec<Value>)> {
    validate_workspace(&value)?;
    let books = value.get_mut("projects").and_then(Value::as_array_mut)
        .ok_or_else(|| "MARGEN_SCHEMA: Falta la lista de libros".to_string())?;
    let books = std::mem::take(books);
    Ok((value, books))
}
fn assemble_workspace(mut root: Value, books: Vec<Value>) -> MResult<Value> {
    let obj = root.as_object_mut()
        .ok_or_else(|| "MARGEN_SCHEMA: Cabecera inválida".to_string())?;
    obj.insert("projects".into(), Value::Array(books));
    validate_workspace(&root)?;
    Ok(root)
}

// --- Medios: las imágenes grandes se guardan una sola vez por contenido. ---
fn data_pattern() -> &'static Regex {
    static RX: OnceLock<Regex> = OnceLock::new();
    RX.get_or_init(||Regex::new(r"data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+")
        .expect("data URI expression"))
}
fn stored_pattern() -> &'static Regex {
    static RX: OnceLock<Regex> = OnceLock::new();
    RX.get_or_init(||Regex::new(r"margen-storage://media/([0-9a-f]{64})\.(png|jpeg|jpg|webp|gif)")
        .expect("stored URI expression"))
}
fn write_atomic(path: &Path, data: &[u8]) -> MResult<()> {
    if path.exists() { return Ok(()); }
    let parent = path.parent().ok_or("Missing parent directory")?;
    fs::create_dir_all(parent).map_err(error)?;
    let temp = parent.join(format!(".margen-{}.tmp",Uuid::new_v4()));
    fs::write(&temp,data).map_err(error)?;
    match fs::rename(&temp,path) {
        Ok(()) => Ok(()),
        Err(_e) if path.exists() => { let _=fs::remove_file(&temp); Ok(()) },
        Err(e) => { let _=fs::remove_file(&temp); Err(error(e)) },
    }
}
fn media_path(dir: &Path, hash: &str, ext: &str) -> PathBuf {
    dir.join("media").join(&hash[0..2]).join(format!("{hash}.{ext}"))
}
fn externalize_string(input: &str, dir: &Path) -> MResult<String> {
    let mut output=String::with_capacity(input.len()); let mut last=0;
    for capture in data_pattern().captures_iter(input) {
        let hit=capture.get(0).unwrap();
        output.push_str(&input[last..hit.start()]);
        let ext=capture.get(1).unwrap().as_str();
        let encoded=hit.as_str().split_once(',').unwrap().1;
        let bytes=STANDARD.decode(encoded).map_err(error)?;
        if bytes.len()>80*1024*1024 {return Err("MARGEN_MEDIA: imagen superior a 80 MB".into())}
        let hash=sha(&bytes);
        write_atomic(&media_path(dir,&hash,ext),&bytes)?;
        output.push_str(&format!("margen-storage://media/{hash}.{ext}"));
        last=hit.end();
    }
    output.push_str(&input[last..]); Ok(output)
}
fn hydrate_string(input: &str, dir: &Path) -> MResult<String> {
    let mut output=String::with_capacity(input.len()); let mut last=0;
    for capture in stored_pattern().captures_iter(input) {
        let hit=capture.get(0).unwrap();
        output.push_str(&input[last..hit.start()]);
        let hash=capture.get(1).unwrap().as_str();
        let ext=capture.get(2).unwrap().as_str();
        let bytes=fs::read(media_path(dir,hash,ext))
            .map_err(|_|format!("MARGEN_MEDIA: falta la imagen {hash}.{ext}"))?;
        if sha(&bytes)!=hash {return Err(format!("MARGEN_MEDIA: imagen dañada {hash}.{ext}"))}
        output.push_str(&format!("data:image/{ext};base64,{}",STANDARD.encode(bytes)));
        last=hit.end();
    }
    output.push_str(&input[last..]); Ok(output)
}
fn walk_media(node: &mut Value, dir: &Path, to_disk: bool) -> MResult<()> {
    match node {
        Value::String(s) => { *s=if to_disk {externalize_string(s,dir)?} else {hydrate_string(s,dir)?}; },
        Value::Array(items) => for item in items {walk_media(item,dir,to_disk)?},
        Value::Object(props) => for value in props.values_mut(){walk_media(value,dir,to_disk)?},
        _ => {},
    }
    Ok(())
}
fn decoded_record(row: &Revision, dir: &Path) -> MResult<Value> {
    if !valid_record(row) {return Err("MARGEN_CORRUPT: la versión guardada no supera la verificación".into())}
    let mut value:Value=serde_json::from_str(&row.content).map_err(error)?;
    walk_media(&mut value,dir,false)?;
    validate_workspace(&value)?;
    Ok(value)
}

// --- Persistencia 1.9.1: cabecera + referencias + versiones inmutables por libro. ---
#[derive(Debug, Clone)]
struct WorkspaceHead {
    content: String,
    checksum: String,
    token: String,
    saved_at: String,
}
#[derive(Debug, Clone)]
struct BookRef { position:i64, book_id:String, version_id:String }
#[derive(Debug)]
struct BookVersion { content:String, checksum:String }

fn fetch_head(db:&Connection, slot:&str)->MResult<Option<WorkspaceHead>> {
    db.query_row(
        "SELECT content,checksum,token,saved_at FROM workspace_heads WHERE slot=?1",
        [slot],
        |row|Ok(WorkspaceHead{content:row.get(0)?,checksum:row.get(1)?,token:row.get(2)?,saved_at:row.get(3)?})
    ).optional().map_err(error)
}
fn fetch_refs(db:&Connection, slot:&str)->MResult<Vec<BookRef>> {
    let mut stmt=db.prepare(
        "SELECT position,book_id,version_id FROM workspace_book_refs WHERE slot=?1 ORDER BY position"
    ).map_err(error)?;
    let rows=stmt.query_map([slot],|row|Ok(BookRef{position:row.get(0)?,book_id:row.get(1)?,version_id:row.get(2)?})).map_err(error)?;
    rows.collect::<Result<Vec<_>,_>>().map_err(error)
}
fn fetch_book_version(db:&Connection, book_id:&str, version_id:&str)->MResult<Option<BookVersion>> {
    db.query_row(
        "SELECT content,checksum FROM book_versions WHERE book_id=?1 AND version_id=?2",
        params![book_id,version_id],
        |row|Ok(BookVersion{content:row.get(0)?,checksum:row.get(1)?})
    ).optional().map_err(error)
}
fn head_meta(row:&WorkspaceHead)->Value { json!({"token":row.token,"time":row.saved_at}) }

fn encoded_value(mut value:Value, dir:&Path)->MResult<(String,String)> {
    walk_media(&mut value,dir,true)?;
    let payload=serde_json::to_string(&value).map_err(error)?;
    let checksum=sha(payload.as_bytes());
    Ok((payload,checksum))
}
fn decoded_value(payload:&str, checksum:&str, dir:&Path)->MResult<Value> {
    if sha(payload.as_bytes())!=checksum {
        return Err("MARGEN_CORRUPT: un registro no supera la verificación".into());
    }
    let mut value:Value=serde_json::from_str(payload).map_err(error)?;
    walk_media(&mut value,dir,false)?;
    Ok(value)
}


// --- Índice ligero 1.10: la biblioteca no materializa todos los libros al arrancar. ---
fn html_tags_pattern() -> &'static Regex {
    static RX: OnceLock<Regex> = OnceLock::new();
    RX.get_or_init(||Regex::new(r"<[^>]*>").expect("html tag expression"))
}
fn disk_book_words(book:&Value)->usize {
    book.get("chapters").and_then(Value::as_array).map(|chapters|chapters.iter().map(|chapter|{
        let html=chapter.get("html").and_then(Value::as_str).unwrap_or("");
        let plain=html_tags_pattern().replace_all(html," ");
        plain.split_whitespace().count()
    }).sum()).unwrap_or(0)
}
fn light_item(item:&Value)->Value {
    let mut out=serde_json::Map::new();
    for key in ["id","title","name","subtitle","iconColor","pinned","flagged","createdAt","updatedAt"] {
        if let Some(value)=item.get(key){out.insert(key.into(),value.clone());}
    }
    Value::Object(out)
}
fn book_summary(book:&Value)->MResult<Value> {
    validate_book(book)?;
    let mut out=serde_json::Map::new();
    for key in ["id","name","description","createdAt","lastOpened","iconColor"] {
        if let Some(value)=book.get(key){out.insert(key.into(),value.clone());}
    }
    // Las portadas se recuperan aparte: así una biblioteca de muchos libros no
    // decodifica todas sus imágenes ni todo su manuscrito durante el arranque.
    let has_cover=book.get("coverData").and_then(Value::as_str).map(|v|!v.is_empty()).unwrap_or(false);
    for key in ["chapters","boards","notes","characters","settings","outlines","chronologies"] {
        let items=book.get(key).and_then(Value::as_array).map(|items|items.iter().map(light_item).collect::<Vec<_>>()).unwrap_or_default();
        out.insert(key.into(),Value::Array(items));
    }
    out.insert("_margenLazy".into(),Value::Bool(true));
    out.insert("_margenSummary".into(),json!({"words":disk_book_words(book),"hasCover":has_cover}));
    Ok(Value::Object(out))
}
fn store_book_summary(db:&Connection, book_id:&str, version_id:&str, summary:&Value)->MResult<()> {
    let payload=serde_json::to_string(summary).map_err(error)?;
    let checksum=sha(payload.as_bytes());
    db.execute(
        "INSERT INTO book_summaries(book_id,version_id,summary,checksum) VALUES(?1,?2,?3,?4)\n         ON CONFLICT(book_id,version_id) DO UPDATE SET summary=excluded.summary,checksum=excluded.checksum",
        params![book_id,version_id,payload,checksum]
    ).map_err(error)?;
    Ok(())
}
fn fetch_or_make_summary(db:&Connection, r:&BookRef)->MResult<Value> {
    if let Some((payload,checksum))=db.query_row(
        "SELECT summary,checksum FROM book_summaries WHERE book_id=?1 AND version_id=?2",
        params![&r.book_id,&r.version_id],
        |row|Ok((row.get::<_,String>(0)?,row.get::<_,String>(1)?))
    ).optional().map_err(error)? {
        if sha(payload.as_bytes())==checksum {
            if let Ok(value)=serde_json::from_str::<Value>(&payload){return Ok(value)}
        }
    }
    let version=fetch_book_version(db,&r.book_id,&r.version_id)?
        .ok_or_else(||format!("MARGEN_CORRUPT: falta la versión {} del libro {}",r.version_id,r.book_id))?;
    if sha(version.content.as_bytes())!=version.checksum{return Err("MARGEN_CORRUPT: libro dañado".into())}
    let book:Value=serde_json::from_str(&version.content).map_err(error)?;
    let summary=book_summary(&book)?;
    store_book_summary(db,&r.book_id,&r.version_id,&summary)?;
    Ok(summary)
}
fn load_slot_index(db:&Connection, dir:&Path, slot:&str)->MResult<Option<Value>> {
    let Some(head)=fetch_head(db,slot)? else{return Ok(None)};
    let mut root=decoded_value(&head.content,&head.checksum,dir)?;
    validate_root(&root)?;
    let mut books=Vec::new();
    for r in fetch_refs(db,slot)? {books.push(fetch_or_make_summary(db,&r)?);}
    let obj=root.as_object_mut().ok_or_else(||"MARGEN_SCHEMA: cabecera inválida".to_string())?;
    obj.insert("projects".into(),Value::Array(books));
    Ok(Some(root))
}
fn current_book(db:&Connection, dir:&Path, book_id:&str)->MResult<Value> {
    let r=fetch_refs(db,"workspace")?.into_iter().find(|r|r.book_id==book_id)
        .ok_or_else(||"MARGEN_BOOK: el libro ya no existe".to_string())?;
    let version=fetch_book_version(db,&r.book_id,&r.version_id)?
        .ok_or_else(||"MARGEN_CORRUPT: falta la versión del libro".to_string())?;
    let book=decoded_value(&version.content,&version.checksum,dir)?;
    validate_book(&book)?;
    Ok(book)
}
fn load_slot(db:&Connection, dir:&Path, slot:&str)->MResult<Option<Value>> {
    let Some(head)=fetch_head(db,slot)? else{return Ok(None)};
    let mut root=decoded_value(&head.content,&head.checksum,dir)?;
    validate_root(&root)?;
    let mut books=Vec::new();
    for r in fetch_refs(db,slot)? {
        let version=fetch_book_version(db,&r.book_id,&r.version_id)?
            .ok_or_else(||format!("MARGEN_CORRUPT: falta la versión {} del libro {}",r.version_id,r.book_id))?;
        let book=decoded_value(&version.content,&version.checksum,dir)?;
        validate_book(&book)?;
        if book.get("id").and_then(Value::as_str)!=Some(r.book_id.as_str()) {
            return Err("MARGEN_CORRUPT: referencia de libro incoherente".into());
        }
        books.push(book);
    }
    root=assemble_workspace(root,books)?;
    Ok(Some(root))
}
fn insert_book_version(db:&Connection, book_id:&str, payload:&str, checksum:&str, saved_at:&str)->MResult<String> {
    let version_id=checksum.to_string();
    db.execute(
        "INSERT OR IGNORE INTO book_versions(book_id,version_id,content,checksum,saved_at) VALUES(?1,?2,?3,?4,?5)",
        params![book_id,&version_id,payload,checksum,saved_at]
    ).map_err(error)?;
    // Una colisión SHA256 no puede hacer que MARGEN reutilice contenido distinto.
    let stored=fetch_book_version(db,book_id,&version_id)?
        .ok_or_else(||"MARGEN_STORAGE: no se pudo recuperar la versión recién guardada".to_string())?;
    if stored.checksum!=checksum || stored.content!=payload {
        return Err("MARGEN_STORAGE: conflicto de huella de contenido".into());
    }
    Ok(version_id)
}
fn replace_slot_head_and_refs(
    db:&Connection, slot:&str, root_payload:&str, root_checksum:&str,
    token:&str, saved_at:&str, refs:&[(String,String)]
)->MResult<()> {
    db.execute(
        "INSERT INTO workspace_heads(slot,content,checksum,token,saved_at) VALUES(?1,?2,?3,?4,?5)
         ON CONFLICT(slot) DO UPDATE SET content=excluded.content,checksum=excluded.checksum,
          token=excluded.token,saved_at=excluded.saved_at",
        params![slot,root_payload,root_checksum,token,saved_at]
    ).map_err(error)?;
    db.execute("DELETE FROM workspace_book_refs WHERE slot=?1",[slot]).map_err(error)?;
    for (position,(book_id,version_id)) in refs.iter().enumerate() {
        db.execute(
            "INSERT INTO workspace_book_refs(slot,position,book_id,version_id) VALUES(?1,?2,?3,?4)",
            params![slot,position as i64,book_id,version_id]
        ).map_err(error)?;
    }
    Ok(())
}
fn copy_workspace_to_recovery(db:&Connection)->MResult<bool> {
    let Some(head)=fetch_head(db,"workspace")? else{return Ok(false)};
    let refs=fetch_refs(db,"workspace")?;
    let pairs=refs.into_iter().map(|r|(r.book_id,r.version_id)).collect::<Vec<_>>();
    replace_slot_head_and_refs(db,"recovery",&head.content,&head.checksum,&head.token,&head.saved_at,&pairs)?;
    Ok(true)
}
fn garbage_collect_book_versions(db:&Connection)->MResult<()> {
    db.execute(
        "DELETE FROM book_versions
         WHERE NOT EXISTS (
            SELECT 1 FROM workspace_book_refs r
            WHERE r.book_id=book_versions.book_id AND r.version_id=book_versions.version_id
         )",[]
    ).map_err(error)?;
    Ok(())
}

// Instala una instantánea que YA está en formato de disco. Se usa sólo en la migración 1.9.0 -> 1.9.1.
fn install_disk_slot(db:&Connection, slot:&str, snapshot:Value, token:&str, saved_at:&str)->MResult<()> {
    let (root,books)=split_workspace(snapshot)?;
    let root_payload=serde_json::to_string(&root).map_err(error)?;
    let root_checksum=sha(root_payload.as_bytes());
    let mut refs=Vec::with_capacity(books.len());
    for book in books {
        validate_book(&book)?;
        let id=book.get("id").and_then(Value::as_str).unwrap().to_string();
        let payload=serde_json::to_string(&book).map_err(error)?;
        let checksum=sha(payload.as_bytes());
        let version=insert_book_version(db,&id,&payload,&checksum,saved_at)?;
        refs.push((id,version));
    }
    replace_slot_head_and_refs(db,slot,&root_payload,&root_checksum,token,saved_at,&refs)
}
fn migrate_legacy_if_needed(db:&mut Connection)->MResult<()> {
    if fetch_head(db,"workspace")?.is_some() || fetch_head(db,"recovery")?.is_some() {return Ok(())}
    let current=fetch(db,"workspace")?;
    let recovery=fetch(db,"recovery")?;
    if current.is_none() && recovery.is_none() {return Ok(())}
    let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(error)?;
    for (slot,row) in [("workspace",current.as_ref()),("recovery",recovery.as_ref())] {
        let Some(row)=row else{continue};
        if !valid_record(row) {continue}
        let snapshot:Value=serde_json::from_str(&row.content).map_err(error)?;
        if validate_workspace(&snapshot).is_err() {continue}
        install_disk_slot(&tx,slot,snapshot,&row.token,&row.saved_at)?;
    }
    garbage_collect_book_versions(&tx)?;
    tx.commit().map_err(error)?;
    Ok(())
}

#[tauri::command]
fn desktop_load_index(app:tauri::AppHandle) -> MResult<Value> {
    let mut db=connect(&app)?;
    migrate_legacy_if_needed(&mut db)?;
    let dir=data_dir(&app)?;
    let mut records=serde_json::Map::new();
    let current_head=fetch_head(&db,"workspace")?;
    let mut current_ok=false;
    if let Some(head)=current_head.as_ref() {
        match load_slot_index(&db,&dir,"workspace") {
            Ok(Some(snapshot))=>{
                records.insert("workspace".into(),snapshot);
                records.insert("workspace-meta".into(),head_meta(head));
                current_ok=true;
            },
            Ok(None)=>{},
            Err(err)=>{
                eprintln!("MARGEN: índice 1.10 no puede recuperarse: {err}");
                records.insert("workspace".into(),json!({"version":-1}));
                records.insert("workspace-meta".into(),head_meta(head));
            }
        }
    } else if let Some(old)=fetch(&db,"workspace")? {
        if decoded_record(&old,&dir).is_err() {
            records.insert("workspace".into(),json!({"version":-1}));
            records.insert("workspace-meta".into(),legacy_record_meta(&old));
        }
    }
    if let Some(recovery_head)=fetch_head(&db,"recovery")? {
        records.insert("recovery-meta".into(),head_meta(&recovery_head));
        records.insert("recoveryAvailable".into(),Value::Bool(true));
        if !current_ok {
            if let Ok(Some(snapshot))=load_slot(&db,&dir,"recovery") {records.insert("recovery".into(),snapshot);}
        }
    }
    if !current_ok && records.get("recovery").is_none() {
        if let Some(old)=fetch(&db,"recovery")? {
            if let Ok(snapshot)=decoded_record(&old,&dir) {
                records.insert("recovery".into(),snapshot);
                records.insert("recovery-meta".into(),legacy_record_meta(&old));
                records.insert("recoveryAvailable".into(),Value::Bool(true));
            }
        }
    }
    Ok(Value::Object(records))
}

#[tauri::command]
fn desktop_load_book(app:tauri::AppHandle, book_id:String)->MResult<Value> {
    if book_id.len()>200{return Err("MARGEN_BOOK: identificador inválido".into())}
    let mut db=connect(&app)?;migrate_legacy_if_needed(&mut db)?;
    current_book(&db,&data_dir(&app)?,&book_id)
}

#[tauri::command]
fn desktop_load_cover(app:tauri::AppHandle, book_id:String)->MResult<Option<String>> {
    if book_id.len()>200{return Err("MARGEN_BOOK: identificador inválido".into())}
    let mut db=connect(&app)?;migrate_legacy_if_needed(&mut db)?;
    let r=fetch_refs(&db,"workspace")?.into_iter().find(|r|r.book_id==book_id)
        .ok_or_else(||"MARGEN_BOOK: el libro ya no existe".to_string())?;
    let version=fetch_book_version(&db,&r.book_id,&r.version_id)?.ok_or_else(||"MARGEN_CORRUPT: falta la versión del libro".to_string())?;
    if sha(version.content.as_bytes())!=version.checksum{return Err("MARGEN_CORRUPT: libro dañado".into())}
    let book:Value=serde_json::from_str(&version.content).map_err(error)?;
    let Some(raw)=book.get("coverData").and_then(Value::as_str) else{return Ok(None)};
    if raw.is_empty(){return Ok(None)}
    let mut value=Value::String(raw.to_string());walk_media(&mut value,&data_dir(&app)?,false)?;
    Ok(value.as_str().map(str::to_string))
}

#[tauri::command]
fn desktop_load_records(app:tauri::AppHandle) -> MResult<Value> {
    let mut db=connect(&app)?;
    migrate_legacy_if_needed(&mut db)?;
    let dir=data_dir(&app)?;
    let mut records=serde_json::Map::new();

    let current_head=fetch_head(&db,"workspace")?;
    let mut current_ok=false;
    if let Some(head)=current_head.as_ref() {
        match load_slot(&db,&dir,"workspace") {
            Ok(Some(snapshot))=>{
                records.insert("workspace".into(),snapshot);
                records.insert("workspace-meta".into(),head_meta(head));
                current_ok=true;
            },
            Ok(None)=>{},
            Err(err)=>{
                eprintln!("MARGEN: workspace 1.9.1 no puede recuperarse: {err}");
                records.insert("workspace".into(),json!({"version":-1}));
                records.insert("workspace-meta".into(),head_meta(head));
            }
        }
    } else if let Some(old)=fetch(&db,"workspace")? {
        // Si la fila 1.9.0 existe pero no pudo migrarse, jamás aparentar un primer inicio limpio.
        if decoded_record(&old,&dir).is_err() {
            records.insert("workspace".into(),json!({"version":-1}));
            records.insert("workspace-meta".into(),legacy_record_meta(&old));
        }
    }

    let mut recovery_loaded=false;
    if let Some(recovery_head)=fetch_head(&db,"recovery")? {
        records.insert("recovery-meta".into(),head_meta(&recovery_head));
        records.insert("recoveryAvailable".into(),Value::Bool(true));
        // En el arranque normal no se duplica toda la biblioteca en RAM. Sólo se
        // materializa recovery automáticamente cuando el principal falla.
        if !current_ok {
            match load_slot(&db,&dir,"recovery") {
                Ok(Some(snapshot))=>{records.insert("recovery".into(),snapshot);recovery_loaded=true;},
                Ok(None)=>{},
                Err(err)=>eprintln!("MARGEN: recovery 1.9.1 no puede recuperarse: {err}"),
            }
        }
    }
    // Última red de seguridad: la instantánea monolítica 1.9.0 nunca se borra durante
    // la migración. Si la nueva recuperación también estuviera dañada, aún puede abrirse.
    if !current_ok && !recovery_loaded {
        if let Some(old)=fetch(&db,"recovery")? {
            if let Ok(snapshot)=decoded_record(&old,&dir) {
                records.insert("recovery".into(),snapshot);
                records.insert("recovery-meta".into(),legacy_record_meta(&old));
                records.insert("recoveryAvailable".into(),Value::Bool(true));
            }
        }
    }
    Ok(Value::Object(records))
}

#[tauri::command]
fn desktop_load_recovery(app:tauri::AppHandle)->MResult<Value> {
    let mut db=connect(&app)?;
    migrate_legacy_if_needed(&mut db)?;
    let dir=data_dir(&app)?;
    let mut out=serde_json::Map::new();
    if let Some(head)=fetch_head(&db,"recovery")? {
        match load_slot(&db,&dir,"recovery") {
            Ok(Some(snapshot))=>{
                out.insert("recovery".into(),snapshot);
                out.insert("recovery-meta".into(),head_meta(&head));
                return Ok(Value::Object(out));
            },
            Ok(None)=>{},
            Err(err)=>eprintln!("MARGEN: recovery 1.9.1 no puede recuperarse: {err}"),
        }
    }
    if let Some(old)=fetch(&db,"recovery")? {
        if let Ok(snapshot)=decoded_record(&old,&dir) {
            out.insert("recovery".into(),snapshot);
            out.insert("recovery-meta".into(),legacy_record_meta(&old));
        }
    }
    Ok(Value::Object(out))
}

fn autos(dir:&Path)->MResult<Vec<PathBuf>>{
    let dir=dir.join("automatic_backups"); if !dir.is_dir(){return Ok(vec![])}
    let mut files=fs::read_dir(dir).map_err(error)?.filter_map(|e|e.ok().map(|v|v.path()))
        .filter(|p|p.file_name().and_then(|x|x.to_str()).map(|n|n.starts_with("MARGEN-autocopia-")&&n.ends_with(".json")).unwrap_or(false))
        .collect::<Vec<_>>();
    files.sort_by_key(|p|fs::metadata(p).and_then(|x|x.modified()).ok()); Ok(files)
}
fn backup_due(dir:&Path)->MResult<bool>{
    let files=autos(dir)?; let Some(p)=files.last() else{return Ok(true)};
    Ok(fs::metadata(p).and_then(|m|m.modified()).map_err(error)?.elapsed().unwrap_or_default()>=Duration::from_secs(86400))
}
fn auto_backup(dir:&Path,bytes:&[u8])->MResult<()> {
    let folder=dir.join("automatic_backups"); fs::create_dir_all(&folder).map_err(error)?;
    write_export_new(&folder.join(format!("MARGEN-autocopia-{}-{}.json",time(),Uuid::new_v4().simple())),bytes)?;
    let files=autos(dir)?; for old in files.iter().take(files.len().saturating_sub(2)){fs::remove_file(old).map_err(error)?;} Ok(())
}
fn create_auto_backup_from_current(app:&tauri::AppHandle, dir:&Path)->MResult<()> {
    if !backup_due(dir).unwrap_or(true) {return Ok(())}
    let db=connect(app)?;
    let snapshot=load_slot(&db,dir,"workspace")?
        .ok_or_else(||"MARGEN_BACKUP: no hay biblioteca principal".to_string())?;
    let bytes=serde_json::to_vec_pretty(&snapshot).map_err(error)?;
    auto_backup(dir,&bytes)
}

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
struct SaveReport {token:String,recovery_available:bool,backup_warning:Option<String>}

fn save_workspace_parts(
    app:&tauri::AppHandle,
    mut root:Value,
    projects:Vec<Value>,
    project_ids:Vec<String>,
    expected_token:Option<String>
)->MResult<SaveReport> {
    // La cabecera nunca contiene proyectos: así cada libro puede persistirse independientemente.
    if let Some(obj)=root.as_object_mut(){obj.insert("projects".into(),Value::Array(vec![]));}
    validate_root(&root)?;
    let mut order_seen=HashSet::new();
    for id in &project_ids {
        if id.is_empty() || !order_seen.insert(id.clone()) {
            return Err("MARGEN_SCHEMA: lista de libros inválida".into());
        }
    }
    let mut changed=HashMap::<String,Value>::new();
    for book in projects {
        validate_book(&book)?;
        let id=book.get("id").and_then(Value::as_str).unwrap().to_string();
        if !order_seen.contains(&id) {return Err("MARGEN_SCHEMA: libro fuera de la biblioteca".into())}
        if changed.insert(id,book).is_some() {return Err("MARGEN_SCHEMA: libro repetido en el guardado".into())}
    }

    let dir=data_dir(app)?;
    // Externalizar sólo la cabecera pequeña y los libros realmente modificados,
    // antes de tomar el bloqueo de escritura SQLite.
    let (root_payload,root_checksum)=encoded_value(root,&dir)?;
    let saved_at=time();
    let mut encoded=HashMap::<String,(String,String,String,Value)>::new();
    for (id,book) in changed {
        let summary=book_summary(&book)?;
        let (payload,checksum)=encoded_value(book,&dir)?;
        let version_id=checksum.clone();
        encoded.insert(id,(payload,checksum,version_id,summary));
    }

    let mut db=connect(app)?;
    migrate_legacy_if_needed(&mut db)?;
    let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(error)?;
    let previous=fetch_head(&tx,"workspace")?;
    let actual=previous.as_ref().map(|h|h.token.clone());
    if actual!=expected_token {return Err("MARGEN_CONFLICT: otra ventana ha cambiado la biblioteca".into())}

    let old_refs=fetch_refs(&tx,"workspace")?;
    let old_map=old_refs.into_iter().map(|r|(r.book_id,r.version_id)).collect::<HashMap<_,_>>();
    let recovery_available=if previous.is_some(){copy_workspace_to_recovery(&tx)?}else{fetch_head(&tx,"recovery")?.is_some()};

    let mut refs=Vec::with_capacity(project_ids.len());
    for id in &project_ids {
        if let Some((payload,checksum,version_id,summary))=encoded.get(id) {
            let stored=insert_book_version(&tx,id,payload,checksum,&saved_at)?;
            if &stored!=version_id {return Err("MARGEN_STORAGE: versión incoherente".into())}
            store_book_summary(&tx,id,&stored,summary)?;
            refs.push((id.clone(),stored));
        } else if let Some(version)=old_map.get(id) {
            refs.push((id.clone(),version.clone()));
        } else {
            return Err(format!("MARGEN_INCREMENTAL: falta el contenido del libro {id}"));
        }
    }
    let token=Uuid::new_v4().to_string();
    replace_slot_head_and_refs(&tx,"workspace",&root_payload,&root_checksum,&token,&saved_at,&refs)?;
    garbage_collect_book_versions(&tx)?;
    tx.commit().map_err(error)?;

    let backup_warning=create_auto_backup_from_current(app,&dir).err();
    Ok(SaveReport{token,recovery_available,backup_warning})
}

#[tauri::command]
fn desktop_save_records(app:tauri::AppHandle, snapshot:Value, expected_token:Option<String>) -> MResult<SaveReport> {
    let (root,projects)=split_workspace(snapshot)?;
    let ids=projects.iter().map(|book|book.get("id").and_then(Value::as_str).unwrap_or("").to_string()).collect();
    save_workspace_parts(&app,root,projects,ids,expected_token)
}

#[tauri::command]
fn desktop_save_incremental(
    app:tauri::AppHandle,
    root:Value,
    projects:Vec<Value>,
    project_ids:Vec<String>,
    expected_token:Option<String>
)->MResult<SaveReport> {
    save_workspace_parts(&app,root,projects,project_ids,expected_token)
}

// --- Soporte y distribución 1.11: salud, datos, diagnóstico y cierre inesperado. ---
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
struct ResourceHealth {name:String,available:bool,size:u64,detail:String}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
struct StartupHealth {
    ok:bool,app_version:String,db_schema:i64,previous_unclean:bool,recovery_available:bool,
    backup_count:usize,latest_backup:Option<String>,resources:Vec<ResourceHealth>,issues:Vec<String>
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
struct SupportInfo {
    app_version:String,data_directory:String,database_size:u64,db_schema:i64,
    backup_count:usize,latest_backup:Option<String>,legal_text:String
}
fn modified_epoch(path:&Path)->Option<String>{
    fs::metadata(path).ok()?.modified().ok()?.duration_since(UNIX_EPOCH).ok().map(|d|d.as_secs().to_string())
}
fn resource_path(app:&tauri::AppHandle,name:&str)->MResult<PathBuf>{
    app.path().resolve(format!("resources/{name}"),BaseDirectory::Resource).map_err(error)
}
fn sqlite_health(path:&Path)->MResult<(u64,String)>{
    let size=fs::metadata(path).map_err(error)?.len();
    let db=Connection::open_with_flags(path,rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX).map_err(error)?;
    let quick:String=db.query_row("PRAGMA quick_check",[],|row|row.get(0)).map_err(error)?;
    if quick.to_lowercase()!="ok"{return Err(format!("quick_check: {quick}"))}
    let _:i64=db.query_row("SELECT COUNT(*) FROM entries LIMIT 1",[],|row|row.get(0)).map_err(error)?;
    Ok((size,"OK".into()))
}
fn lexicon_health(app:&tauri::AppHandle)->Vec<ResourceHealth>{
    ["lexicons/english.sqlite3","lexicons/spanish-synonyms.sqlite3","lexicons/spanish-definitions-CC-BY-SA.sqlite3"].into_iter().map(|name|{
        match resource_path(app,name).and_then(|p|sqlite_health(&p)) {
            Ok((size,detail))=>ResourceHealth{name:name.into(),available:true,size,detail},
            Err(err)=>ResourceHealth{name:name.into(),available:false,size:0,detail:err},
        }
    }).collect()
}
fn append_error_log(dir:&Path,message:&str)->MResult<()> {
    let folder=dir.join("diagnostics");fs::create_dir_all(&folder).map_err(error)?;
    let path=folder.join("margen-errors.log");
    let clean=message.replace('\r'," ").replace('\n'," ").chars().take(1200).collect::<String>();
    let mut lines=fs::read_to_string(&path).unwrap_or_default().lines().map(str::to_string).collect::<Vec<_>>();
    lines.push(format!("{} | {}",time(),clean));
    if lines.len()>200{lines.drain(0..lines.len()-200);}
    fs::write(path,lines.join("\n")+"\n").map_err(error)
}
fn recent_error_log(dir:&Path)->String{
    let path=dir.join("diagnostics").join("margen-errors.log");
    let text=fs::read_to_string(path).unwrap_or_default();
    text.lines().rev().take(40).collect::<Vec<_>>().into_iter().rev().collect::<Vec<_>>().join("\n")
}
fn directory_stats(path:&Path)->(u64,u64){
    fn walk(path:&Path,files:&mut u64,bytes:&mut u64){
        let Ok(items)=fs::read_dir(path) else{return};
        for item in items.flatten(){let p=item.path();if let Ok(meta)=item.metadata(){if meta.is_dir(){walk(&p,files,bytes)}else if meta.is_file(){*files+=1;*bytes+=meta.len();}}}
    }
    let(mut files,mut bytes)=(0,0);walk(path,&mut files,&mut bytes);(files,bytes)
}
fn support_info(app:&tauri::AppHandle)->MResult<SupportInfo>{
    let dir=data_dir(app)?;let db=connect(app)?;
    let db_schema:i64=db.query_row("PRAGMA user_version",[],|row|row.get(0)).map_err(error)?;
    let db_size=fs::metadata(dir.join("margen.sqlite3")).map(|m|m.len()).unwrap_or(0);
    let backups=autos(&dir)?;let latest=backups.last().and_then(|p|modified_epoch(p));
    let legal=resource_path(app,"LEGAL_LEXICONS.txt").ok().and_then(|p|fs::read_to_string(p).ok()).unwrap_or_else(||"No se pudo abrir el archivo de licencias incluido en esta instalación.".into());
    Ok(SupportInfo{app_version:MARGEN_VERSION.into(),data_directory:dir.to_string_lossy().into_owned(),database_size:db_size,db_schema,backup_count:backups.len(),latest_backup:latest,legal_text:legal})
}
#[tauri::command]
fn desktop_startup_health(app:tauri::AppHandle)->MResult<StartupHealth>{
    let dir=data_dir(&app)?;let mut issues=Vec::new();
    let db=connect(&app)?;
    let quick:String=db.query_row("PRAGMA quick_check",[],|row|row.get(0)).map_err(error)?;
    if quick.to_lowercase()!="ok"{issues.push(format!("Base de datos: {quick}"));}
    let db_schema:i64=db.query_row("PRAGMA user_version",[],|row|row.get(0)).map_err(error)?;
    let recovery_available=fetch_head(&db,"recovery")?.is_some()||fetch(&db,"recovery")?.is_some();
    let resources=lexicon_health(&app);for r in &resources{if !r.available{issues.push(format!("Recurso {}: {}",r.name,r.detail));}}
    let backups=autos(&dir)?;let latest=backups.last().and_then(|p|modified_epoch(p));
    let previous_unclean=*PREVIOUS_UNCLEAN.get().unwrap_or(&false);
    if previous_unclean{issues.push("La sesión anterior no terminó con un cierre normal.".into());}
    Ok(StartupHealth{ok:issues.iter().all(|x|x.starts_with("La sesión anterior")),app_version:MARGEN_VERSION.into(),db_schema,previous_unclean,recovery_available,backup_count:backups.len(),latest_backup:latest,resources,issues})
}
#[tauri::command]
fn desktop_support_info(app:tauri::AppHandle)->MResult<SupportInfo>{support_info(&app)}
#[tauri::command]
fn desktop_log_error(app:tauri::AppHandle,message:String)->MResult<()> {
    if message.len()>5000{return Err("MARGEN_DIAGNOSTIC: mensaje demasiado largo".into())}
    append_error_log(&data_dir(&app)?,&message)
}
#[tauri::command]
fn desktop_open_data_folder(app:tauri::AppHandle)->MResult<()> {
    let dir=data_dir(&app)?;
    #[cfg(target_os="windows")]
    {Command::new("explorer.exe").arg(&dir).spawn().map_err(error)?;}
    #[cfg(target_os="macos")]
    {Command::new("open").arg(&dir).spawn().map_err(error)?;}
    #[cfg(all(unix,not(target_os="macos")))]
    {Command::new("xdg-open").arg(&dir).spawn().map_err(error)?;}
    Ok(())
}
fn diagnostic_text(app:&tauri::AppHandle)->MResult<String>{
    let dir=data_dir(app)?;let info=support_info(app)?;let db=connect(app)?;
    let quick:String=db.query_row("PRAGMA quick_check",[],|row|row.get(0)).unwrap_or_else(|e|format!("ERROR: {e}"));
    let heads:i64=db.query_row("SELECT COUNT(*) FROM workspace_heads",[],|r|r.get(0)).unwrap_or(-1);
    let books:i64=db.query_row("SELECT COUNT(*) FROM workspace_book_refs WHERE slot='workspace'",[],|r|r.get(0)).unwrap_or(-1);
    let versions:i64=db.query_row("SELECT COUNT(*) FROM book_versions",[],|r|r.get(0)).unwrap_or(-1);
    let summaries:i64=db.query_row("SELECT COUNT(*) FROM book_summaries",[],|r|r.get(0)).unwrap_or(-1);
    let(media_files,media_bytes)=directory_stats(&dir.join("media"));
    let resources=lexicon_health(app);
    let mut out=String::new();
    out.push_str("MARGEN · INFORME DE DIAGNÓSTICO\n");out.push_str("================================\n");
    out.push_str(&format!("Versión: {}\nSO: {} / {}\nEsquema BD: {}\nSQLite quick_check: {}\n",MARGEN_VERSION,std::env::consts::OS,std::env::consts::ARCH,info.db_schema,quick));
    out.push_str(&format!("Libros referenciados: {}\nVersiones de libro: {}\nResúmenes: {}\nCabeceras: {}\n",books,versions,summaries,heads));
    out.push_str(&format!("Tamaño BD: {} bytes\nMedios: {} archivos / {} bytes\nAutocopias: {}\nÚltima autocopia (epoch): {}\n",info.database_size,media_files,media_bytes,info.backup_count,info.latest_backup.as_deref().unwrap_or("ninguna")));
    out.push_str("\nRECURSOS LÉXICOS\n");for r in resources{out.push_str(&format!("- {}: {} ({} bytes) {}\n",r.name,if r.available{"OK"}else{"ERROR"},r.size,r.detail));}
    let errors=recent_error_log(&dir);out.push_str("\nERRORES RECIENTES (sin manuscritos)\n");if errors.is_empty(){out.push_str("Ninguno registrado.\n")}else{out.push_str(&errors);out.push('\n');}
    out.push_str("\nPrivacidad: este informe no incluye el texto de capítulos, fichas, notas ni imágenes del usuario.\n");
    Ok(out)
}

// --- Exportación nativa: sólo el selector de Windows determina la ruta. ---
fn without_collision(path:&Path, i:u32)->PathBuf {
    if i==0{return path.to_path_buf()}
    let stem=path.file_stem().and_then(|x|x.to_str()).unwrap_or("MARGEN");
    let ext=path.extension().and_then(|x|x.to_str()).unwrap_or("");
    path.with_file_name(if ext.is_empty(){format!("{stem}-{i}")}else{format!("{stem}-{i}.{ext}")})
}
fn write_export_new(path:&Path,data:&[u8])->MResult<PathBuf>{
    use std::fs::OpenOptions;
    for i in 0..1000 {
        let candidate=without_collision(path,i);
        match OpenOptions::new().write(true).create_new(true).open(&candidate){
            Ok(mut file)=>{
                if let Err(e)=file.write_all(data).and_then(|_|file.sync_all()){
                    drop(file);let _=fs::remove_file(&candidate);return Err(error(e));
                }
                return Ok(candidate)
            },
            Err(e) if e.kind()==std::io::ErrorKind::AlreadyExists=>continue,
            Err(e)=>return Err(error(e)),
        }
    }
    Err("MARGEN_EXPORT: Demasiados archivos con el mismo nombre".into())
}
async fn choose_and_export(app:tauri::AppHandle,filename:String,ext:String,bytes:Vec<u8>)->MResult<Option<String>>{
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog=app.dialog().file().set_title("MARGEN · Guardar como").set_file_name(filename);
        dialog=match ext.as_str(){
            "json"=>dialog.add_filter("MARGEN JSON", &["json"]),
            "docx"=>dialog.add_filter("Word", &["docx"]),
            "pdf"=>dialog.add_filter("PDF", &["pdf"]),
            _=>dialog.add_filter("Texto", &["txt"]),
        };
        let Some(file)=dialog.blocking_save_file() else{return Ok(None)};
        let mut path=file.into_path().map_err(error)?;
        if path.extension().and_then(|x|x.to_str()).map(|x|x.eq_ignore_ascii_case(&ext))!=Some(true){path.set_extension(&ext);}
        Ok(Some(write_export_new(&path,&bytes)?.to_string_lossy().into_owned()))
    }).await.map_err(error)?
}
#[tauri::command]
async fn desktop_export_diagnostics(app:tauri::AppHandle)->MResult<Option<String>>{
    let text=diagnostic_text(&app)?;
    choose_and_export(app,format!("MARGEN-diagnostico-{}.txt",time()),"txt".into(),text.into_bytes()).await
}
#[tauri::command]
async fn desktop_export_backup(app:tauri::AppHandle,snapshot:Value,kind:String)->MResult<Option<String>>{
    validate_workspace(&snapshot)?;
    let kind=if kind=="conflict"{"conflicto"}else{"copia"};
    let bytes=serde_json::to_vec_pretty(&snapshot).map_err(error)?;
    choose_and_export(app,format!("MARGEN-{kind}-{}.json",time()),"json".into(),bytes).await
}
#[tauri::command]
async fn desktop_export_document(app:tauri::AppHandle,filename:String,extension:String,data_base64:String)->MResult<Option<String>>{
    if !matches!(extension.as_str(),"docx"|"pdf"|"txt"){return Err("MARGEN_EXPORT: formato no permitido".into());}
    if data_base64.len()>128*1024*1024{return Err("MARGEN_EXPORT: tamaño máximo excedido".into());}
    let bytes=STANDARD.decode(data_base64).map_err(error)?;
    if bytes.is_empty()||bytes.len()>95*1024*1024{return Err("MARGEN_EXPORT: archivo vacío o demasiado grande".into());}
    if extension=="pdf"&&!bytes.starts_with(b"%PDF-"){return Err("MARGEN_EXPORT: PDF no válido".into())}
    if extension=="docx"&&!bytes.starts_with(b"PK\x03\x04"){return Err("MARGEN_EXPORT: DOCX no válido".into())}
    let bare=filename.strip_suffix(&format!(".{extension}")).unwrap_or(&filename);
    let stem:String=bare.chars().filter(|c|!matches!(*c,'/'|'\\'|':'|'*'|'?'|'"'|'<'|'>'|'|')&&!c.is_control()).take(90).collect();
    let stem=stem.trim().trim_matches('.');let stem=if stem.is_empty(){"Manuscrito"}else{stem};
    choose_and_export(app,format!("{stem}.{extension}"),extension,bytes).await
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app|{
            let previous=app.path().app_data_dir().ok().map(|dir|{
                let _=fs::create_dir_all(&dir);let marker=dir.join("session.lock");let was=marker.exists();
                let _=fs::write(&marker,format!("{} {}",MARGEN_VERSION,time()));was
            }).unwrap_or(false);
            let _=PREVIOUS_UNCLEAN.set(previous);
            Ok(())
        })
        .on_window_event(|window,event|{
            if matches!(event,tauri::WindowEvent::CloseRequested{..}) {
                if let Ok(dir)=window.app_handle().path().app_data_dir(){let _=fs::remove_file(dir.join("session.lock"));}
            }
        })
        .invoke_handler(tauri::generate_handler![
            desktop_load_index,desktop_load_book,desktop_load_cover,desktop_load_records,desktop_load_recovery,desktop_save_records,desktop_save_incremental,
            desktop_export_backup,desktop_export_document,desktop_export_diagnostics,desktop_startup_health,desktop_support_info,desktop_log_error,desktop_open_data_folder,
            lexicon::lexical_lookup
        ])
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar MARGEN");
}

#[cfg(test)]
mod tests {
    use super::*;
    fn sample_book(id:&str,title:&str)->Value{
        json!({"id":id,"name":title,"chapters":[],"boards":[],"notes":[]})
    }
    fn sample_workspace()->Value{
        json!({"version":1,"theme":"light","projects":[sample_book("a","A"),sample_book("b","B")]})
    }
    #[test] fn image_media_roundtrip(){
        let dir=std::env::temp_dir().join(format!("margen-test-{}",Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        let input=r#"<img src="data:image/png;base64,aGVsbG8=" />"#;
        let stored=externalize_string(input,&dir).unwrap();
        assert!(stored.contains("margen-storage://"));
        assert_eq!(hydrate_string(&stored,&dir).unwrap(),input);
        fs::remove_dir_all(&dir).unwrap();
    }
    #[test] fn export_no_overwrite(){
        let dir=std::env::temp_dir().join(format!("margen-export-{}",Uuid::new_v4()));fs::create_dir_all(&dir).unwrap();
        let file=dir.join("libro.pdf");fs::write(&file,b"OLD").unwrap();
        let other=write_export_new(&file,b"NEW").unwrap();assert_ne!(file,other);
        assert_eq!(fs::read(&file).unwrap(),b"OLD");assert_eq!(fs::read(other).unwrap(),b"NEW");
        fs::remove_dir_all(dir).unwrap();
    }
    #[test] fn rotate_backups(){
        let dir=std::env::temp_dir().join(format!("margen-auto-{}",Uuid::new_v4()));
        for n in 0..4{auto_backup(&dir,format!("{n}").as_bytes()).unwrap();}
        assert_eq!(autos(&dir).unwrap().len(),2);fs::remove_dir_all(dir).unwrap();
    }
    #[test] fn validate_requires_books(){
        assert!(validate_workspace(&json!({"version":1,"projects":[]})).is_ok());
        assert!(validate_workspace(&json!({"version":1})).is_err());
    }
    #[test] fn split_and_reassemble_preserves_workspace(){
        let original=sample_workspace();
        let (root,books)=split_workspace(original.clone()).unwrap();
        assert_eq!(root.get("projects").unwrap().as_array().unwrap().len(),0);
        assert_eq!(assemble_workspace(root,books).unwrap(),original);
    }
    #[test] fn book_versions_are_reused_by_content(){
        let db=Connection::open_in_memory().unwrap();ensure_schema(&db).unwrap();
        let payload=serde_json::to_string(&sample_book("a","A")).unwrap();let checksum=sha(payload.as_bytes());
        let a=insert_book_version(&db,"a",&payload,&checksum,"1").unwrap();
        let b=insert_book_version(&db,"a",&payload,&checksum,"2").unwrap();
        assert_eq!(a,b);
        let count:i64=db.query_row("SELECT COUNT(*) FROM book_versions",[],|r|r.get(0)).unwrap();
        assert_eq!(count,1);
    }
    #[test] fn lightweight_summary_does_not_keep_manuscript_or_cover(){
        let book=json!({"id":"a","name":"A","coverData":"data:image/png;base64,aGVsbG8=","chapters":[{"id":"c","title":"Uno","html":"<p>dos palabras</p>","flagged":true}],"boards":[],"notes":[],"characters":[],"settings":[],"outlines":[],"chronologies":[]});
        let summary=book_summary(&book).unwrap();
        assert_eq!(summary["_margenLazy"],true);
        assert_eq!(summary["_margenSummary"]["words"],2);
        assert!(summary.get("coverData").is_none());
        assert!(summary["chapters"][0].get("html").is_none());
        assert_eq!(summary["chapters"][0]["flagged"],true);
    }
    #[test] fn recovery_refs_do_not_duplicate_book_payloads(){
        let db=Connection::open_in_memory().unwrap();ensure_schema(&db).unwrap();
        let payload=serde_json::to_string(&sample_book("a","A")).unwrap();let checksum=sha(payload.as_bytes());
        let version=insert_book_version(&db,"a",&payload,&checksum,"1").unwrap();
        let root=json!({"version":1,"theme":"light","projects":[]});let root_payload=serde_json::to_string(&root).unwrap();let root_sha=sha(root_payload.as_bytes());
        replace_slot_head_and_refs(&db,"workspace",&root_payload,&root_sha,"token","1",&[("a".into(),version)]).unwrap();
        assert!(copy_workspace_to_recovery(&db).unwrap());
        let count:i64=db.query_row("SELECT COUNT(*) FROM book_versions",[],|r|r.get(0)).unwrap();
        assert_eq!(count,1);
        assert_eq!(fetch_refs(&db,"recovery").unwrap().len(),1);
    }
    #[test] fn schema_version_is_formalized_for_distribution(){
        let db=Connection::open_in_memory().unwrap();ensure_schema(&db).unwrap();migrate_database(&db).unwrap();
        let version:i64=db.query_row("PRAGMA user_version",[],|r|r.get(0)).unwrap();
        assert_eq!(version,DB_SCHEMA_VERSION);
        let count:i64=db.query_row("SELECT COUNT(*) FROM schema_migrations WHERE version=?1",[DB_SCHEMA_VERSION],|r|r.get(0)).unwrap();
        assert_eq!(count,1);
    }
    #[test] fn error_log_is_bounded(){
        let dir=std::env::temp_dir().join(format!("margen-log-{}",Uuid::new_v4()));fs::create_dir_all(&dir).unwrap();
        for n in 0..240{append_error_log(&dir,&format!("error {n}")).unwrap();}
        let text=recent_error_log(&dir);assert!(text.contains("error 239"));assert!(!text.contains("error 0
"));
        fs::remove_dir_all(dir).unwrap();
    }

}
