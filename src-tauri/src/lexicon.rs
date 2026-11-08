//! MARGEN 1.11.0: read-only, offline lexical search over three separately licensed databases.
//! No writing project information to third-party resources; no network permissions.
use rusqlite::{params,Connection};
use serde::Serialize;
use std::path::PathBuf;
use tauri::{path::BaseDirectory,Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LexicalEntry {
    lemma: String,
    part_of_speech: String,
    gloss: String,
    synonyms: Vec<String>,
    source: &'static str,
    license: &'static str,
    url: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LexicalResult {
    word: String,
    language: String,
    definitions: Vec<LexicalEntry>,
    synonym_groups: Vec<LexicalEntry>,
    available: bool,
}

fn fetch_database(path: PathBuf, key: &str, source: &'static str, license: &'static str, words_only: bool) -> Result<Vec<LexicalEntry>,String> {
    let db = Connection::open_with_flags(path,rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX)
        .map_err(|e|format!("MARGEN_LEXICON_MISSING: {e}"))?;
    let mut stmt=db.prepare("SELECT lemma,pos,gloss,synonyms,url FROM entries WHERE key=?1 LIMIT 14").map_err(|e|e.to_string())?;
    let rows=stmt.query_map(params![key],|row|{
        let text: String=row.get(3)?;
        Ok((row.get::<_,String>(0)?,row.get::<_,String>(1)?,row.get::<_,String>(2)?,text,row.get::<_,String>(4)?))
    }).map_err(|e|e.to_string())?;
    let mut entries=Vec::new();
    for row in rows {
        let (lemma,part_of_speech,gloss,serialized,url)=row.map_err(|e|e.to_string())?;
        let synonyms=serde_json::from_str::<Vec<String>>(&serialized).unwrap_or_default();
        if words_only && synonyms.is_empty() {continue;}
        entries.push(LexicalEntry{lemma,part_of_speech,gloss,synonyms,source,license,url});
    }
    Ok(entries)
}

#[tauri::command]
pub(crate) fn lexical_lookup(app:tauri::AppHandle,term:String,language:String) -> Result<LexicalResult,String> {
    let word=term.trim();
    if word.chars().count()>90 {return Err("MARGEN_LEXICON_QUERY: término demasiado largo".into())}
    let en=language=="en";
    if !en && language!="es" {return Err("MARGEN_LEXICON_LANGUAGE: solo español o inglés".into())}
    let mut result=LexicalResult{word:word.to_string(),language,definitions:Vec::new(),synonym_groups:Vec::new(),available:true};
    if word.is_empty(){return Ok(result)}
    let key=word.to_lowercase();
    let resource=|name:&str|->Result<PathBuf,String>{
        app.path().resolve(format!("resources/lexicons/{name}"),BaseDirectory::Resource).map_err(|e|e.to_string())
    };
    if en {
        let rows=fetch_database(resource("english.sqlite3")?,&key,"Open English WordNet 2025","CC BY 4.0 + Princeton WordNet License",false)?;
        for entry in rows {
            if !entry.gloss.is_empty(){result.definitions.push(LexicalEntry{lemma:entry.lemma.clone(),part_of_speech:entry.part_of_speech.clone(),gloss:entry.gloss.clone(),synonyms:Vec::new(),source:entry.source,license:entry.license,url:entry.url.clone()})}
            if !entry.synonyms.is_empty(){result.synonym_groups.push(entry)}
        }
    } else {
        result.definitions=fetch_database(resource("spanish-definitions-CC-BY-SA.sqlite3")?,&key,"Wikcionario (colaboradores de Wikimedia)","CC BY-SA 4.0",false)?;
        result.synonym_groups=fetch_database(resource("spanish-synonyms.sqlite3")?,&key,"Spanish WordNet MCR 3.0","CC BY 3.0",true)?;
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn reads_local_data_and_preserves_license(){
        let temp=std::env::temp_dir().join(format!("margen-lexicon-test-{}.sqlite3",std::process::id()));
        let db=Connection::open(&temp).unwrap();
        db.execute_batch("CREATE TABLE entries (key TEXT,lemma TEXT,pos TEXT,gloss TEXT,synset TEXT,synonyms TEXT,url TEXT); INSERT INTO entries VALUES('escribir','escribir','v','', '1-v', '[\"redactar\"]','https://example.test');").unwrap();
        drop(db);
        let found=fetch_database(temp.clone(),"escribir","MCR","CC BY 3.0",true).unwrap();
        assert_eq!(found[0].synonyms[0],"redactar");
        assert_eq!(found[0].license,"CC BY 3.0");
        let _=std::fs::remove_file(temp);
    }
}
