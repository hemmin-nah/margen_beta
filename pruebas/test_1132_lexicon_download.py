"""Pruebas sin red: HTTP 503, respaldo oficial y errores permanentes."""
import io, pathlib, sys, urllib.error
from unittest.mock import patch

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import herramientas_lexicas as lex

class Response:
 def __init__(self,data):self.data=data
 def __enter__(self):return self
 def __exit__(self,*args):return False
 def read(self):return self.data

def http_error(url,code):
 return urllib.error.HTTPError(url,code,f'HTTP {code}',{},None)

primary=lex.SRC['en']
fallback=lex.FALLBACKS['en'][0]
assert 'github.com/globalwordnet/english-wordnet/releases/download/2025-edition/' in fallback

# El fallo 503 del pantallazo se reintenta y recupera.
calls=[]
def once_then_success(req,timeout=150):
 calls.append(req.full_url)
 if len(calls)==1:raise http_error(req.full_url,503)
 return Response(b'ok')
with patch.object(lex.urllib.request,'urlopen',side_effect=once_then_success),patch.object(lex.time,'sleep') as wait:
 blob,url=lex.download(primary,lex.FALLBACKS['en'])
 assert (blob,url)==(b'ok',primary)
 assert calls==[primary,primary]
 wait.assert_called_once_with(4)

# Si en-word.net persiste caído, utilizar la copia oficial del release de GitHub.
calls=[]
def use_fallback(req,timeout=150):
 calls.append(req.full_url)
 if req.full_url==primary:raise http_error(req.full_url,503)
 return Response(b'wordnet-2025')
with patch.object(lex.urllib.request,'urlopen',side_effect=use_fallback),patch.object(lex.time,'sleep') as wait:
 blob,url=lex.download(primary,lex.FALLBACKS['en'])
 assert (blob,url)==(b'wordnet-2025',fallback)
 assert calls==[primary,primary,primary,fallback]
 assert wait.call_count==2

# No reintenta un 404: usa el respaldo inmediatamente.
calls=[]
def not_found_then_fallback(req,timeout=150):
 calls.append(req.full_url)
 if req.full_url==primary:raise http_error(req.full_url,404)
 return Response(b'release')
with patch.object(lex.urllib.request,'urlopen',side_effect=not_found_then_fallback),patch.object(lex.time,'sleep') as wait:
 assert lex.download(primary,(fallback,))==(b'release',fallback)
 assert calls==[primary,fallback]
 wait.assert_not_called()

# Nunca continúa el build sin recurso válido.
with patch.object(lex.urllib.request,'urlopen',side_effect=lambda req,timeout=150: (_ for _ in ()).throw(http_error(req.full_url,503))),patch.object(lex.time,'sleep'):
 try:lex.download(primary,(fallback,),attempts=2)
 except RuntimeError as exc:assert 'ninguna fuente' in str(exc)
 else:raise AssertionError('Se permitió continuar sin descargar el diccionario')

print('PASS 1.13.2: recuperación HTTP 503, respaldo GitHub y error seguro')
