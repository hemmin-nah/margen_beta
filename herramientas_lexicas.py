#!/usr/bin/env python3
"""MARGEN 1.10.1: lexical resources bundled at build time; no network access during use.
Three INDEPENDENT SQLite databases, preserving source licenses.
The script fails CI if sources cannot be fetched or validated.
"""
from __future__ import annotations
import argparse, datetime, gzip, hashlib, io, json, pathlib, re, sqlite3, sys, tempfile, urllib.parse, urllib.request, zipfile
from collections import defaultdict

ROOT=pathlib.Path(__file__).resolve().parent
OUT=ROOT/'src-tauri'/'resources'/'lexicons'
SRC={
 'en': 'https://en-word.net/static/english-wordnet-2025.zip',
 'spa': 'https://raw.githubusercontent.com/omwn/omw-data/main/wns/mcr/wn-data-spa.tab',
 'wik': 'https://kaikki.org/eswiktionary/raw-wiktextract-data.jsonl.gz',
}
SPANISH_BLOB_SHA='86c9e367d64a794300b414e55c78b54dbb07eb27'
SCHEMA='''CREATE TABLE entries (key TEXT NOT NULL, lemma TEXT NOT NULL, pos TEXT NOT NULL, gloss TEXT NOT NULL, synset TEXT NOT NULL, synonyms TEXT NOT NULL, url TEXT NOT NULL);
CREATE INDEX idx_entries_key ON entries(key);'''

def key(word): return str(word).strip().lower()
def database(path):
 path.parent.mkdir(parents=True,exist_ok=True)
 if path.exists():path.unlink()
 db=sqlite3.connect(path)
 db.executescript('PRAGMA journal_mode=DELETE; PRAGMA synchronous=OFF; '+SCHEMA)
 return db

def rows_from_wn(data:bytes):
 """Official Princeton WNDB data.noun/data.verb/data.adj/data.adv structure."""
 for text in data.decode('utf-8','replace').splitlines():
  if not re.match(r'^\d{8}\s',text):continue
  head,sep,definition=text.partition('|');parts=head.split()
  try:
   offset,kind=parts[0],parts[2];count=int(parts[3],16)
   if not 0<count<=180:continue
   lemmas=list(dict.fromkeys(parts[4+2*i].replace('_',' ') for i in range(count)))
   gloss=definition.strip().split('; "')[0].strip()
   if not lemmas:continue
   yield offset+'-'+kind,kind,gloss,lemmas
  except (ValueError,IndexError):continue

def build_english(zipped:bytes,path:pathlib.Path):
 db=database(path);num=0;groups=0
 with zipfile.ZipFile(io.BytesIO(zipped)) as z:
  files=[name for name in z.namelist() if pathlib.PurePosixPath(name).name in ('data.noun','data.verb','data.adj','data.adv')]
  if len(files)!=4:raise ValueError('Open English WordNet: no se encontraron los cuatro archivos WNDB data.*')
  for file in files:
   for synset,pos,gloss,words in rows_from_wn(z.read(file)):
    groups+=1
    for lemma in words:
     alternates=[w for w in words if key(w)!=key(lemma)][:30]
     db.execute('INSERT INTO entries VALUES(?,?,?,?,?,?,?)',(key(lemma),lemma,pos,gloss,synset,json.dumps(alternates,ensure_ascii=False),'https://en-word.net/'))
     num+=1
 db.commit();db.close()
 if groups<60000 or num<70000:raise ValueError(f'Datos OEWN incompletos: {groups} synsets, {num} entradas')
 return {'synsets':groups,'entries':num}

def build_spanish(content:bytes,path:pathlib.Path):
 if hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()!=SPANISH_BLOB_SHA:
  raise ValueError('El archivo Spanish WordNet no coincide con el SHA del recurso oficial auditado')
 groups=defaultdict(list)
 for line in content.decode('utf-8-sig').splitlines():
  bits=line.strip().split('\t')
  if len(bits)<3 or 'lemma' not in bits[1].lower():continue
  synset,word=bits[0],bits[2].strip()
  if not re.match(r'^\d{8}-[anvrs]$',synset) or not word or len(word)>100:continue
  if word not in groups[synset]:groups[synset].append(word)
 db=database(path);num=0
 for synset,words in groups.items():
  for lemma in words:
   alternatives=[w for w in words if key(w)!=key(lemma)][:30]
   db.execute('INSERT INTO entries VALUES(?,?,?,?,?,?,?)',(key(lemma),lemma,synset[-1],'',synset,json.dumps(alternatives,ensure_ascii=False),'https://nlp.lsi.upc.edu/esWN/licenseWN.php'))
   num+=1
 db.commit();db.close()
 if len(groups)<15000 or num<20000:raise ValueError(f'Datos MCR incompletos: {len(groups)} conjuntos, {num} lemas')
 return {'synsets':len(groups),'entries':num}

def build_wiktionary(raw_gz:bytes,path:pathlib.Path,min_expected=10000):
 db=database(path);entries=0;pages=0
 with gzip.GzipFile(fileobj=io.BytesIO(raw_gz)) as reader:
  for ln in reader:
   try:d=json.loads(ln)
   except (ValueError,UnicodeDecodeError):continue
   if d.get('lang_code')!='es':continue
   lemma=d.get('word')
   if not isinstance(lemma,str) or len(lemma)>100:continue
   senses=d.get('senses') or []
   if not isinstance(senses,list):continue
   pages+=1
   url='https://es.wiktionary.org/wiki/'+urllib.parse.quote(lemma.replace(' ','_'),safe='')
   for i,sense in enumerate(senses[:16]):
    if not isinstance(sense,dict):continue
    texts=sense.get('glosses') or sense.get('raw_glosses') or []
    if not isinstance(texts,list):continue
    for gloss in texts[:2]:
     if not isinstance(gloss,str) or not 3<=len(gloss.strip())<=800:continue
     # No reproducimos ejemplos, citas, audio, imágenes ni etimologías.
     db.execute('INSERT INTO entries VALUES(?,?,?,?,?,?,?)',(key(lemma),lemma,str(d.get('pos','')),gloss.strip(),str(i),'[]',url))
     entries+=1
 db.commit();db.close()
 if entries<min_expected:raise ValueError(f'Extracción insuficiente de Wikcionario: {entries} acepciones')
 return {'pages':pages,'definitions':entries}

def download(url):
 req=urllib.request.Request(url,headers={'User-Agent':'MARGEN-lexicon-build/1.10.1 (offline lexical resource packaging; authors acknowledged)','Accept':'application/octet-stream,*/*'})
 with urllib.request.urlopen(req,timeout=150) as resp:
  return resp.read()

def run_build():
 OUT.mkdir(parents=True,exist_ok=True)
 results={};sources={};now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 for name in ('en','spa','wik'):
  print('Recuperando fuente oficial:',name,SRC[name],flush=True)
  raw=download(SRC[name]);sources[name]={'url':SRC[name],'downloadedAt':now,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
  if name=='en':results['en']=build_english(raw,OUT/'english.sqlite3')
  if name=='spa':results['spa']=build_spanish(raw,OUT/'spanish-synonyms.sqlite3')
  if name=='wik':results['wik']=build_wiktionary(raw,OUT/'spanish-definitions-CC-BY-SA.sqlite3')
 # Pack copies of original license terms and notices with the installer.
 licenses={
  'OpenEnglishWordNet_LICENSE.md':'https://raw.githubusercontent.com/globalwordnet/english-wordnet/main/LICENSE.md',
  'Princeton_WordNet_LICENSE.txt':'https://raw.githubusercontent.com/globalwordnet/english-wordnet/main/WNDB_License.txt',
  'SpanishWordNet_MCR_LICENSE.txt':'https://raw.githubusercontent.com/omwn/omw-data/main/wns/mcr/LICENSE',
  'CreativeCommons_BY_3.0.html':'https://creativecommons.org/licenses/by/3.0/legalcode',
  'CreativeCommons_BY_4.0.html':'https://creativecommons.org/licenses/by/4.0/legalcode',
  'CreativeCommons_BY_SA_4.0.html':'https://creativecommons.org/licenses/by-sa/4.0/legalcode',
 }
 license_dir=ROOT/'src-tauri'/'resources'/'licenses';license_dir.mkdir(parents=True,exist_ok=True)
 license_provenance={}
 for filename,url in licenses.items():
  blob=download(url)
  if len(blob)<300:raise ValueError(f'Licencia inesperadamente breve o no disponible: {filename}')
  (license_dir/filename).write_bytes(blob)
  license_provenance[filename]={'url':url,'sha256':hashlib.sha256(blob).hexdigest()}
 manifest={'version':'1.10.1' ,'sources':sources,'licenses':license_provenance,'counts':results,'transformations':{'en':'WNDB → SQLite por acepción y sinónimos, sin imágenes','spa':'OMW Spanish MCR 3.0 → SQLite por conjunto semántico','wik':'Wiktextract de Wikcionario ES → SQLite; solo glosses, sin ejemplos/medios/etimologías'}}
 (OUT/'SOURCE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(results,indent=2,ensure_ascii=False))

def run_verify():
 required={
  'english.sqlite3':70000,
  'spanish-synonyms.sqlite3':20000,
  'spanish-definitions-CC-BY-SA.sqlite3':10000,
 }
 problems=[]
 for name,minimum in required.items():
  path=OUT/name
  if not path.is_file() or path.stat().st_size<4096:
   problems.append(f'{name}: ausente o vacío');continue
  try:
   db=sqlite3.connect(f'file:{path.as_posix()}?mode=ro',uri=True)
   check=db.execute('PRAGMA quick_check').fetchone()[0]
   count=db.execute('SELECT COUNT(*) FROM entries').fetchone()[0]
   db.close()
   if check!='ok':problems.append(f'{name}: quick_check={check}')
   if count<minimum:problems.append(f'{name}: solo {count} entradas (mínimo {minimum})')
  except Exception as exc:problems.append(f'{name}: {exc}')
 manifest=OUT/'SOURCE_MANIFEST.json'
 if not manifest.is_file():problems.append('SOURCE_MANIFEST.json: ausente')
 else:
  try:
   data=json.loads(manifest.read_text(encoding='utf-8'))
   if not data.get('sources') or not data.get('licenses'):problems.append('SOURCE_MANIFEST.json: procedencia/licencias incompletas')
  except Exception as exc:problems.append(f'SOURCE_MANIFEST.json: {exc}')
 license_dir=ROOT/'src-tauri'/'resources'/'licenses'
 for name in ('OpenEnglishWordNet_LICENSE.md','Princeton_WordNet_LICENSE.txt','SpanishWordNet_MCR_LICENSE.txt','CreativeCommons_BY_3.0.html','CreativeCommons_BY_4.0.html','CreativeCommons_BY_SA_4.0.html'):
  if not (license_dir/name).is_file():problems.append(f'licenses/{name}: ausente')
 if problems:
  raise SystemExit('MARGEN_LEXICON_VERIFY_FAIL\n- '+'\n- '.join(problems))
 print('Recursos léxicos empaquetables: OK')

def run_test():
 with tempfile.TemporaryDirectory() as temp:
  t=pathlib.Path(temp)
  rows=['00001740 03 n 02 entity 0 thing 0 000 | that which has its own existence', '00002500 03 v 02 write 0 compose 0 000 | mark letters on a surface']
  fixture='\n'.join(rows).encode()
  assert len(list(rows_from_wn(fixture)))==2
  # Check Wikcionario isolation and free text rendering.
  data={'word':'melancolía','lang_code':'es','pos':'noun','senses':[{'glosses':['Tristeza profunda y persistente.']}]}
  zipped=gzip.compress((json.dumps(data,ensure_ascii=False)+'\n').encode())
  built=build_wiktionary(zipped,t/'wik.sqlite3',min_expected=1)
  assert built['definitions']==1
  cn=sqlite3.connect(t/'wik.sqlite3');assert cn.execute("SELECT gloss FROM entries WHERE key='melancolía'").fetchone()[0].startswith('Tristeza')
  cn.close()
  print('Pruebas locales del transformador: OK')

if __name__=='__main__':
 p=argparse.ArgumentParser();group=p.add_mutually_exclusive_group(required=True);group.add_argument('--build',action='store_true');group.add_argument('--verify',action='store_true');group.add_argument('--test',action='store_true')
 x=p.parse_args()
 if x.build:run_build()
 elif x.verify:run_verify()
 else:run_test()
