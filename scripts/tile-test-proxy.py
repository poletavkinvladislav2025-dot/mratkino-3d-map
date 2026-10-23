"""Test-only HTTPS relay. Python validates upstream TLS; Chromium never bypasses TLS checks."""
import hashlib,json,pathlib,threading,time
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
import requests
CACHE=pathlib.Path('/tmp/beloretsk-real-tile-cache');CACHE.mkdir(exist_ok=True)
ALLOWED={'tiles.mapterhorn.com','tiles.openfreemap.org','static.tildacdn.com'}
SLOTS={host:threading.BoundedSemaphore(4) for host in ALLOWED}
LOCKS={};LOCK_GUARD=threading.Lock()
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/health':self.send_response(200);self.end_headers();self.wfile.write(b'ok');return
  target=parse_qs(urlparse(self.path).query).get('url',[''])[0]
  if urlparse(target).hostname not in ALLOWED or urlparse(target).scheme!='https':self.send_error(403);return
  key=hashlib.sha256(target.encode()).hexdigest();path=CACHE/key;meta=CACHE/(key+'.json')
  try:
   with LOCK_GUARD:lock=LOCKS.setdefault(key,threading.Lock())
   with lock:
    if path.exists() and meta.exists():body=path.read_bytes();info=json.loads(meta.read_text())
    else:
     with SLOTS[urlparse(target).hostname]:response=requests.get(target,timeout=40,headers={'User-Agent':'VisitBeloretsk-Map-QA/0.1 (development browser test)'})
     body=response.content;info={'status':response.status_code,'type':response.headers.get('Content-Type','application/octet-stream'),'url':target}
     if response.status_code==200:path.write_bytes(body);meta.write_text(json.dumps(info))
   self.send_response(info['status']);self.send_header('Content-Type',info['type']);self.send_header('Access-Control-Allow-Origin','*');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  except (BrokenPipeError,ConnectionResetError):pass
  except Exception as error:self.send_error(502,str(error))
ThreadingHTTPServer(('127.0.0.1',4399),Handler).serve_forever()
