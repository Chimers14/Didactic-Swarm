"use strict";
(() => {
const $=id=>document.getElementById(id);
const overlay=$('sourcesOverlay'), list=$('sourceList'), view=$('sourceViewport'), def=$('sourceDefinition');
const sources=[];let current=null,page=1,selected=null,pdf=null,token=0,ocrWorker=null,searchTimer=null;
// Resize the READ workspace itself; leave page pixels and word physics untouched.
const readMain=overlay.querySelector('.source-main');
const readSplitter=$('sourcePaneSplitter');
let readSplitPixels=null;
const readClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function readSplitLimits(){
  const main=readMain.getBoundingClientRect();
  const viewport=view.getBoundingClientRect();
  const physics=$('sourcePhysics').getBoundingClientRect();
  const available=viewport.height+physics.height;
  const min=Math.min(30,Math.max(15,available*.05));
  return {available,min,max:Math.max(min,available-min)};
}
function readSetSplit(px){
  const {min,max}=readSplitLimits();
  readSplitPixels=readClamp(px,min,max);
  readMain.style.setProperty('--read-pane-height',readSplitPixels+'px');
  readSplitter.setAttribute('aria-valuenow',String(Math.round(readSplitPixels/Math.max(1,max+min)*100)));
  readSplitter.setAttribute('aria-valuetext',Math.round(readSplitPixels)+' pixels high');
}
function readResetSplit(){readSplitPixels=null;readMain.style.removeProperty('--read-pane-height');readSplitter.setAttribute('aria-valuetext','Default split');}
let readDrag=null;
readSplitter.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();
  readDrag={id:e.pointerId,y:e.clientY,height:view.getBoundingClientRect().height};
  readSplitter.classList.add('is-dragging');document.body.classList.add('source-resizing');
  try{readSplitter.setPointerCapture(e.pointerId)}catch{}
});
readSplitter.addEventListener('pointermove',e=>{
  if(!readDrag||e.pointerId!==readDrag.id)return;
  e.preventDefault();readSetSplit(readDrag.height+e.clientY-readDrag.y);
});
function readStopDrag(e){if(!readDrag||e.pointerId!==readDrag.id)return;readDrag=null;readSplitter.classList.remove('is-dragging');document.body.classList.remove('source-resizing');try{readSplitter.releasePointerCapture(e.pointerId)}catch{}}
readSplitter.addEventListener('pointerup',readStopDrag);
readSplitter.addEventListener('pointercancel',readStopDrag);
readSplitter.addEventListener('lostpointercapture',()=>{readDrag=null;readSplitter.classList.remove('is-dragging');document.body.classList.remove('source-resizing');});
readSplitter.addEventListener('dblclick',readResetSplit);
readSplitter.addEventListener('keydown',e=>{
  if(e.key==='Home'){e.preventDefault();readResetSplit();return;}
  if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
  e.preventDefault();readSetSplit(view.getBoundingClientRect().height+(e.key==='ArrowDown'?1:-1)*(e.shiftKey?60:20));
});
new ResizeObserver(()=>{if(readSplitPixels!==null&&!readDrag){const {min,max}=readSplitLimits();if(readSplitPixels<min||readSplitPixels>max)readSetSplit(readSplitPixels);}}).observe(readMain);

// IMAGE ZOOM CONTROLS

let imageZoomMode = 'fit';
let imageZoomFactor = 1;

const zoomBar = $('sourceZoomControls');
const zoomLabel = $('sourceZoomLabel');

function updateImageZoom() {
  const img = view.querySelector('.source-page.zoomable img');
  if (!img || !img.naturalWidth) return;

  const availableWidth = Math.max(1, view.clientWidth - 48);
  const availableHeight = Math.max(1, view.clientHeight - 48);

  const fit = Math.min(
    1,
    availableWidth / img.naturalWidth,
    availableHeight / img.naturalHeight
  );

  const scale = imageZoomMode === 'fit'
    ? fit
    : imageZoomFactor;

  img.style.width = `${img.naturalWidth * scale}px`;
  img.style.height = `${img.naturalHeight * scale}px`;

  if (zoomLabel) zoomLabel.textContent = imageZoomMode === 'fit'
    ? 'FIT'
    : Math.round(scale * 100) + '%';
}

function setImageZoom(mode, factor) {
  imageZoomMode = mode;

  if (factor !== undefined) {
    imageZoomFactor = Math.max(0.1, Math.min(5, factor));
  }

  updateImageZoom();
}

$('sourceZoomFit').onclick = () => setImageZoom('fit');

$('sourceZoomActual').onclick = () => setImageZoom('manual', 1);

$('sourceZoomIn').onclick = () => {
  const img = view.querySelector('img');
  if (!img?.naturalWidth) return;

  const current = imageZoomMode === 'fit'
    ? img.getBoundingClientRect().width / img.naturalWidth
    : imageZoomFactor;

  setImageZoom('manual', current * 1.25);
};

$('sourceZoomOut').onclick = () => {
  const img = view.querySelector('img');
  if (!img?.naturalWidth) return;

  const current = imageZoomMode === 'fit'
    ? img.getBoundingClientRect().width / img.naturalWidth
    : imageZoomFactor;

  setImageZoom('manual', current / 1.25);
};

new ResizeObserver(() => {
  if (imageZoomMode === 'fit') updateImageZoom();
}).observe(view);
const videos=['hRlIUqOuiVs','MNqJK1gVss8',];let lastVideo=-1;
const safe=(s)=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=t=>$('sourceFeedback').textContent=t;
const filename=u=>decodeURIComponent(u.split('/').pop().split('?')[0]);
const kind=u=>/\.pdf$/i.test(u)?'pdf':/\.(png|jpe?g|webp|gif|bmp|avif|svg|tiff?)$/i.test(u)?'image':/\.txt$/i.test(u)?'text':'pages';
function add(item){if(!item?.title)return;sources.push({...item,type:item.type||kind(item.src||''),pages:item.pages||[]});refresh();}
function refresh(){let q=$('sourceSearch').value.trim().toLocaleLowerCase();list.replaceChildren();sources.filter(s=>!q||s.title.toLocaleLowerCase().includes(q)||s.searchText?.toLocaleLowerCase().includes(q)).forEach(s=>{let b=document.createElement('button');b.textContent=s.title;b.className=s===current?'active':'';b.onclick=()=>openSource(s);list.append(b);});if(!list.children.length)list.textContent='No matching sources';}
function clearSelection(){selected?.classList.remove('selected');selected=null;def.textContent='Tap one word to see its meaning. Tap again or outside to deselect.';}
function words(text,parent,absolute=false){let fragment=document.createDocumentFragment(),re=/([\p{L}\p{M}]+(?:[’'\-][\p{L}\p{M}]+)*)/gu,last=0,m;while((m=re.exec(text))){fragment.append(document.createTextNode(text.slice(last,m.index)));let span=document.createElement('span'),word=m[0];span.className='source-word';span.textContent=word;span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label','Define or release '+word);span.style.touchAction='none';let press=null,lastTap=0;const drop=(x,y,hold=false,id=null)=>{let b=window.sourcePhysics?.spawn(word,x,y);if(b&&hold&&id!==null){window.sourcePhysics?.grab(b,{pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,preventDefault(){}});}return b;};span.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;let now=Date.now();if(e.pointerType!=='mouse'&&now-lastTap<380){e.preventDefault();drop(e.clientX,e.clientY);press=null;lastTap=0;return;}lastTap=now;press={id:e.pointerId,x:e.clientX,y:e.clientY,spawned:false};try{span.setPointerCapture(e.pointerId)}catch{}});span.addEventListener('pointermove',e=>{if(!press||press.id!==e.pointerId)return;if(!press.spawned&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10){press.spawned=true;span.dataset.dragged='1';drop(e.clientX,e.clientY,true,e.pointerId);}});span.addEventListener('pointerup',e=>{if(press?.id===e.pointerId)press=null;});span.addEventListener('pointercancel',()=>press=null);span.addEventListener('click',e=>{e.stopPropagation();if(!span.dataset.dragged)select(span,word);delete span.dataset.dragged;});span.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();if(span.dataset.dragged)return;drop(e.clientX,e.clientY);});span.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(span,word);}});fragment.append(span);last=re.lastIndex;}fragment.append(document.createTextNode(text.slice(last)));parent.append(fragment);}
async function select(el,word){if(selected===el){clearSelection();return;}selected?.classList.remove('selected');selected=el;el.classList.add('selected');const lang=$('sourceLanguage').value;def.textContent=`${word} — looking up ${lang}…`;let msg='No verified definition found. Try another language or consult a specialist dictionary.';try{let url=`https://${lang==='jam'?'en':lang}.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&origin=*&titles=${encodeURIComponent(word)}`;let res=await fetch(url);if(res.ok){let data=await res.json();let pg=Object.values(data.query?.pages||{})[0];let raw=pg?.extract||'';let section=raw.split(/\n\s*\n/).map(x=>x.trim()).find(x=>x.length>15&&!/^==/.test(x));if(section)msg=section.slice(0,1100)+'\nSOURCE: Wiktionary ('+lang+')';}if(msg.startsWith('No verified')&&lang==='en'){let r=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);if(r.ok){let j=await r.json();msg=j[0]?.meanings?.[0]?.definitions?.[0]?.definition||msg;}}}catch{msg='Dictionary unavailable offline. Try again when connected.';}if(selected===el)def.textContent=`${word} (${lang})\n${msg}`;}
async function openSource(s){imageZoomMode = 'fit';window.sourcePhysics?.clear();current=s;page=1;pdf=null;token++;clearSelection();refresh();$('sourceTitle').textContent=s.title;await render();}
function controls(n){$('sourcePageCount').textContent=n?`${page} / ${n}`:'—';$('sourcePrev').disabled=page<=1;$('sourceNext').disabled=page>=n;}



async function render(){const t=++token;view.replaceChildren();view.scrollTop = 0;
view.scrollLeft = 0;

if (zoomBar) zoomBar.hidden = !(current &&
  (current.type === 'pages' || current.type === 'image'));clearSelection();if(!current)return;let s=current;notice('');try{if(s.type==='pages'){let n=s.pages.length;controls(n);if(!n){view.textContent='No images yet. Add numbered PNGs to sources/ and rebuild the manifest.';return;}let img=document.createElement('img');img.src=s.pages[page-1];img.alt=`${s.title}, page ${page}`;
let wrap=document.createElement('div');wrap.className='source-page zoomable';wrap.append(img);view.append(wrap);
img.addEventListener('load',updateImageZoom,{once:true});
img.addEventListener('error',()=>{if(t===token){notice('Could not load '+s.pages[page-1]+'. Check your sources folder and rebuild the manifest.');wrap.textContent='Image file not found: '+s.pages[page-1];}});
if(img.complete&&img.naturalWidth)updateImageZoom();
notice('Image page: use RECOGNIZE IMAGE TEXT to select words.');return;}



if(s.type==='image'){controls(1);let img=document.createElement('img');img.src=s.src;img.alt=s.title;let wrap = document.createElement('div');
wrap.className = 'source-page zoomable';
wrap.append(img);
view.append(wrap);

img.addEventListener('load', updateImageZoom, { once: true });

if (img.complete && img.naturalWidth) {
  updateImageZoom();
}notice('Use OCR to select words.');return;}
if(s.type==='text'){controls(1);let txt=s.text??await(await fetch(s.src)).text();if(t!==token)return;let d=document.createElement('div');d.className='source-text';words(txt,d);view.append(d);return;}
if(s.type==='pdf'){if(!window.pdfjsLib)throw Error('PDF viewer library unavailable. Check internet connection.');pdf=pdf||await pdfjsLib.getDocument(s.src).promise;if(t!==token)return;controls(pdf.numPages);let pg=await pdf.getPage(page);let vp=pg.getViewport({scale:1.5});let cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);let wrap=document.createElement('div');wrap.className='source-page';wrap.append(cv);view.append(wrap);await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;if(t!==token)return;let text=await pg.getTextContent();let layer=document.createElement('div');layer.className='source-pdf-text';wrap.append(layer);for(let item of text.items){if(!item.str?.trim())continue;let transform=pdfjsLib.Util.transform(vp.transform,item.transform);let x=transform[4],y=transform[5],font=Math.hypot(transform[2],transform[3]);let container=document.createElement('span');container.style.cssText=`position:absolute;left:${x/vp.width*100}%;top:${(y-font)/vp.height*100}%;font-size:${font/vp.width*100}cqw;white-space:pre;`;container.style.fontSize=font+'px';container.style.transform=`scale(${Math.max(.1,(item.width*vp.scale)/(Math.max(1,item.str.length*font*.56)))},1)`;container.style.transformOrigin='left top';words(item.str,container);layer.append(container);}wrap.style.containerType='inline-size';if(!text.items.some(i=>i.str?.trim()))notice('Scanned PDF page: use OCR to recognize words.');else notice('Tap one word on the page to define it.');return;}
}catch(e){if(t===token)view.textContent='Unable to open source: '+e.message;}}
async function recognize(){let img=view.querySelector('img,canvas');if(!img){notice('Open an image or scanned PDF page first.');return;}notice('Loading OCR engine; this may take a while…');try{if(!window.Tesseract){await new Promise((ok,fail)=>{let s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=ok;s.onerror=fail;document.head.append(s);});}let lang=$('sourceLanguage').value;let supported={en:'eng',fr:'fra',es:'spa',pt:'por',ht:'hat',sw:'swa'};let code=supported[lang]||'eng';let worker=await Tesseract.createWorker(code);notice('Recognizing text…');let result=await worker.recognize(img);await worker.terminate();let d=document.createElement('div');d.className='source-text';words(result.data.text||'',d);view.replaceChildren(d);notice('OCR transcript (may contain errors). Tap any word. Original page returns when you change pages.');}catch(e){notice('OCR failed: '+e.message+'; try English or check connectivity.');}}
$('flashTab').onclick=()=>{let panel=$('flashTabPanel'),expanded=panel.hidden;panel.hidden=!expanded;$('flashTab').setAttribute('aria-expanded',String(expanded));$('flashTab').textContent=(expanded?'▾ ':'▸ ')+'PDFs, ARTWORKS, ETC';};
window.openSources=()=>{if(overlay.classList.contains('open'))return;overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');$('sourceSearch').focus();refresh();};
function close(){window.sourcePhysics?.clear();overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');clearSelection();}
$('closeSources').onclick=close;
$('sourcePrev').onclick=()=>{if(page>1){page--;render();}};
$('sourceNext').onclick=()=>{let n=current?.type==='pdf'?pdf?.numPages:current?.type==='pages'?current.pages.length:1;if(page<n){page++;render();}};
$('sourceOCR').onclick=recognize;
$('sourceClearWords').onclick=()=>window.sourcePhysics?.clear();
$('sourceSearch').addEventListener('input',()=>{refresh();});
$('sourceUpload').addEventListener('change',e=>{for(let f of e.target.files){let src=URL.createObjectURL(f);add({title:f.name,src,type:kind(f.name)});}e.target.value='';});
view.addEventListener('click',e=>{if(!e.target.closest('.source-word'))clearSelection();});
$('sourceLanguage').addEventListener('change',()=>clearSelection());
window.openRandomVideo=()=>{let i=Math.floor(Math.random()*videos.length);if(i===lastVideo&&videos.length>1)i=(i+1)%videos.length;lastVideo=i;if(location.hash!=='#video')history.pushState({mixupVideo:true},'', '#video');let frame=document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${videos[i]}?autoplay=1`;frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;frame.title='Random YouTube video';$('videoFrame').replaceChildren(frame);$('videoOverlay').classList.add('open');$('videoOverlay').setAttribute('aria-hidden','false');const el=$('videoOverlay');if(el.requestFullscreen)el.requestFullscreen().catch(()=>{});if(screen.orientation?.lock)screen.orientation.lock('landscape').catch(()=>{});};
$('videoShuffle').onclick=window.openRandomVideo;
$('videoBack').onclick=()=>$('videoClose').click();
$('videoClose').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});if(screen.orientation?.unlock)screen.orientation.unlock();$('videoFrame').replaceChildren();$('videoOverlay').classList.remove('open');$('videoOverlay').setAttribute('aria-hidden','true');if(location.hash==='#video' && history.state?.mixupVideo)history.back();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(overlay.classList.contains('open'))close();if($('videoOverlay').classList.contains('open'))$('videoClose').click();}});
window.addEventListener('popstate',()=>{if($('videoOverlay').classList.contains('open'))$('videoClose').click();});
fetch('sources/manifest.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{(data.sources||[]).forEach(add);if(sources.length){let preferred=sources.find(x=>x.title.toLowerCase().includes('flash of the spirit'));if(preferred)openSource(preferred);}}).catch(()=>{notice('No source manifest found. Upload a file or run the manifest builder.');});
})();
