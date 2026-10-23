"""Keep two earlier preview builds' hashed chunks so already-open tabs can lazy-load.
Only fixed-origin, flat assets/ filenames are accepted; no arbitrary URLs or paths.
"""
import hashlib,json,pathlib,re,sys,urllib.request,datetime
ORIGIN='https://poletavkinvladislav2025-dot.github.io/mratkino-3d-map/preview/region/'
PATTERN=re.compile(r'assets/[A-Za-z0-9_.-]+\.(?:js|mjs|css)$')
def valid_assets(generation):
 if not isinstance(generation,dict):return []
 assets=generation.get('assets',[])
 if not isinstance(assets,list) or len(assets)>80:return []
 return [a for a in assets if isinstance(a,dict) and isinstance(a.get('path'),str) and PATTERN.fullmatch(a['path']) and isinstance(a.get('sha256'),str) and re.fullmatch('[0-9a-f]{64}',a['sha256'])]
def main():
 global ORIGIN
 if len(sys.argv)>3:
  if sys.argv[3] not in {'region','explorer','landscape'}:raise ValueError('Unknown preview path')
  ORIGIN='https://poletavkinvladislav2025-dot.github.io/mratkino-3d-map/preview/'+sys.argv[3]+'/'
 output=pathlib.Path(sys.argv[1]);ref=sys.argv[2];assets=[]
 for path in sorted((output/'assets').iterdir()):
  relative=path.relative_to(output).as_posix()
  if PATTERN.fullmatch(relative):assets.append({'path':relative,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 previous=[]
 try:
  with urllib.request.urlopen(ORIGIN+'build-info.json',timeout=20) as response:
   manifest=response.read(128*1024+1)
   if len(manifest)>128*1024:raise ValueError('manifest size limit')
   previous=[g for g in json.loads(manifest).get('generations',[]) if isinstance(g,dict) and g.get('ref')!=ref][:2]
 except Exception as error:print('Previous preview manifest unavailable:',type(error).__name__)
 retained=[];total=0
 for generation in previous:
  verified=[]
  for asset in valid_assets(generation):
   path=output/asset['path']
   try:
    if not path.exists():
     with urllib.request.urlopen(ORIGIN+asset['path'],timeout=20) as response:body=response.read(3*1024*1024+1)
     total+=len(body)
     if len(body)>3*1024*1024 or total>25*1024*1024:raise ValueError('asset size limit')
     if hashlib.sha256(body).hexdigest()!=asset['sha256']:raise ValueError('asset hash mismatch')
     path.write_bytes(body)
    if hashlib.sha256(path.read_bytes()).hexdigest()==asset['sha256']:verified.append(asset)
   except Exception as error:print('Could not retain',asset['path'],type(error).__name__)
  if verified:retained.append({'ref':str(generation.get('ref','unknown'))[:80],'assets':verified})
 manifest={'ref':ref,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'generations':[{'ref':ref,'assets':assets},*retained]}
 (output/'build-info.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('Preview assets:',len(assets),'retained generations:',len(retained),'retained download bytes:',total)
if __name__=='__main__':main()
