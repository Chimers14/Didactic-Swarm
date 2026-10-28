"""Run: python build_sources.py — scans sources/ and writes sources/manifest.json."""
from pathlib import Path
import json,re
root=Path(__file__).parent/'sources'
root.mkdir(parents=True,exist_ok=True)
items=[]
for d in sorted(root.iterdir()):
 if d.is_dir():
  pages=sorted([x for x in d.iterdir() if x.suffix.lower() in ('.png','.jpg','.jpeg','.webp','.gif','.bmp','.avif','.svg','.tif','.tiff')],key=lambda p:[int(v) if v.isdigit() else v.lower() for v in re.split(r'(\d+)',p.name)])
  if pages:items.append({'title':d.name.replace('_',' ').replace('-',' '),'type':'pages','pages':['sources/'+d.name+'/'+p.name for p in pages]})
 elif d.suffix.lower() in ('.pdf','.txt','.png','.jpg','.jpeg','.webp','.gif','.bmp','.avif','.svg','.tif','.tiff'):
  items.append({'title':d.stem.replace('_',' '),'type':'pdf' if d.suffix.lower()=='.pdf' else 'text' if d.suffix.lower()=='.txt' else 'image','src':'sources/'+d.name})
(root/'manifest.json').write_text(json.dumps({'sources':items},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Indexed {len(items)} sources.')
