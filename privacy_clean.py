"""Copy files into clean_output with PNG/JPEG metadata removed. PDF requires pypdf.
Usage: python -m pip install pillow pypdf; python privacy_clean.py path/to/file-or-folder
"""
from pathlib import Path
from PIL import Image
import sys
source=Path(sys.argv[1]); output=Path('clean_output');output.mkdir(exist_ok=True)
files=source.rglob('*') if source.is_dir() else [source]
for f in files:
 if not f.is_file():continue
 target=output/(f.relative_to(source) if source.is_dir() else f.name);target.parent.mkdir(parents=True,exist_ok=True)
 if f.suffix.lower() in ('.png','.jpg','.jpeg','.webp'):
  with Image.open(f) as im:
   im.load();clean=Image.new(im.mode,im.size);clean.putdata(list(im.getdata()));clean.save(target,format=im.format)
 elif f.suffix.lower()=='.pdf':
  from pypdf import PdfReader,PdfWriter
  r=PdfReader(f);w=PdfWriter();w.append_pages_from_reader(r);w.add_metadata({});
  with target.open('wb') as dest:w.write(dest)
 else:continue
 print('Cleaned',target)
print('Review cleaned files before publication: embedded text, watermarks, visible personal information and document content may remain.')
