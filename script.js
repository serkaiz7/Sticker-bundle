/* Sticker Bundle Creator - Vanilla JS + Canvas
   Features:
   - Multi image upload
   - Auto arrange grid
   - Drag to move, wheel to scale, Q/E to rotate
   - Dial for rotation, slider for scale
   - Optional outline behind each sticker (rounded rect)
   - Add text stickers (font, size, color)
   - Download PNG, Print
*/

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// UI elements
const fileInput = document.getElementById('fileInput');
const btnAuto = document.getElementById('btnAutoArrange');
const rotateDial = document.getElementById('rotateDial');
const scaleRange = document.getElementById('scaleRange');
const btnDelete = document.getElementById('btnDelete');
const btnFront = document.getElementById('btnBringToFront');
const btnBack = document.getElementById('btnSendToBack');
const btnDownload = document.getElementById('btnDownload');
const btnPrint = document.getElementById('btnPrint');
const textInput = document.getElementById('textInput');
const btnAddText = document.getElementById('btnAddText');
const fontSelect = document.getElementById('fontSelect');
const fontSize = document.getElementById('fontSize');
const textColor = document.getElementById('textColor');
const outlineToggle = document.getElementById('outlineToggle');
const outlineSize = document.getElementById('outlineSize');
const canvasW = document.getElementById('canvasW');
const canvasH = document.getElementById('canvasH');
const btnResizeCanvas = document.getElementById('btnResizeCanvas');

// ====== Model ======
/** @typedef {'image'|'text'} StickerType */
const stickers = []; // Array of Sticker
let selectedId = null;
let dragState = null; // {id, startX, startY, origX, origY}

const createId = () => Math.random().toString(36).slice(2, 10);

function createImageSticker(img){
  const id = createId();
  // Initial scale so the longest edge ~ 240px
  const maxEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(1, 240 / maxEdge);
  return {
    id,
    type: 'image',
    img,
    x: canvas.width/2,
    y: canvas.height/2,
    scale,
    rotation: 0, // degrees
    outline: true,
    text: null, // unused
    w: img.naturalWidth,
    h: img.naturalHeight
  };
}

function createTextSticker(text, fontFamily, sizePx, color){
  const id = createId();
  return {
    id,
    type: 'text',
    img: null,
    x: canvas.width/2,
    y: canvas.height/2,
    scale: 1,
    rotation: 0,
    outline: true,
    text: { value: text, fontFamily, sizePx, color },
    w: 0,
    h: 0
  };
}

function getStickerById(id){ return stickers.find(s => s.id === id) }
function bringToFront(id){
  const idx = stickers.findIndex(s => s.id === id);
  if(idx >= 0){ const [s] = stickers.splice(idx, 1); stickers.push(s); }
}
function sendToBack(id){
  const idx = stickers.findIndex(s => s.id === id);
  if(idx >= 0){ const [s] = stickers.splice(idx, 1); stickers.unshift(s); }
}

// ====== Drawing ======
function clear(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

// Rounded rectangle helper
function roundRectPath(ctx, x, y, w, h, r){
  const rr = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

// Measure text block
function measureTextBlock(text, fontFamily, sizePx){
  ctx.save();
  ctx.font = `${sizePx}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width);
  const h = Math.ceil(sizePx * 1.2);
  ctx.restore();
  return {w, h};
}

function drawSticker(s){
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate((s.rotation * Math.PI) / 180);
  ctx.scale(s.scale, s.scale);

  const showOutline = outlineToggle.checked && s.outline;
  const pad = Number(outlineSize.value) || 0; // outline thickness in px (device space)
  const outlinePad = pad / Math.max(s.scale, 0.0001); // convert to local space

  if(s.type === 'image'){
    const iw = s.w, ih = s.h;
    if(showOutline && outlinePad > 0){
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.04)';
      ctx.shadowBlur = 0;
      roundRectPath(ctx, -iw/2 - outlinePad, -ih/2 - outlinePad, iw + outlinePad*2, ih + outlinePad*2, Math.min(40, Math.max(iw, ih)*0.06));
      ctx.fill();
    }
    ctx.drawImage(s.img, -iw/2, -ih/2, iw, ih);

  } else if(s.type === 'text'){
    const { value, fontFamily, sizePx, color } = s.text;
    const { w, h } = measureTextBlock(value, fontFamily, sizePx);
    if(showOutline && outlinePad > 0){
      ctx.fillStyle = '#ffffff';
      roundRectPath(ctx, -w/2 - outlinePad, -h/2 - outlinePad, w + outlinePad*2, h + outlinePad*2, Math.min(24, sizePx*0.35));
      ctx.fill();
    }
    ctx.font = `${sizePx}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(value, 0, 0);
    // Keep w/h for hit tests
    s.w = w; s.h = h;
  }

  // selection box
  if(s.id === selectedId){
    ctx.lineWidth = 2 / Math.max(s.scale, 0.0001);
    ctx.strokeStyle = '#3b82f6';
    const bbPad = 6 / Math.max(s.scale, 0.0001);
    const w = s.w, h = s.h;
    roundRectPath(ctx, -w/2 - bbPad, -h/2 - bbPad, w + bbPad*2, h + bbPad*2, 8 / Math.max(s.scale, 0.0001));
    ctx.stroke();
  }

  ctx.restore();
}

function draw(){
  clear();
  for(const s of stickers) drawSticker(s);
  requestAnimationFrameId = null;
}
let requestAnimationFrameId = null;
function scheduleDraw(){
  if(requestAnimationFrameId == null) requestAnimationFrameId = requestAnimationFrame(draw);
}

// ====== Hit testing ======
function pointInSticker(px, py, s){
  // Transform point into sticker's local coordinates
  const dx = px - s.x;
  const dy = py - s.y;
  const ang = - (s.rotation * Math.PI / 180);
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const lx = (dx * cos - dy * sin) / s.scale;
  const ly = (dx * sin + dy * cos) / s.scale;

  const w = s.w, h = s.h;
  // Hit test bounding box (with small padding)
  const pad = 8;
  return lx >= -w/2 - pad && lx <= w/2 + pad && ly >= -h/2 - pad && ly <= h/2 + pad;
}

function pickTopmostSticker(px, py){
  for(let i = stickers.length - 1; i >= 0; i--){
    const s = stickers[i];
    if(pointInSticker(px, py, s)) return s;
  }
  return null;
}

// ====== Events ======
canvas.addEventListener('mousedown', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left);
  const y = (e.clientY - rect.top);

  const hit = pickTopmostSticker(x, y);
  if(hit){
    selectedId = hit.id;
    rotateDial.value = String(hit.rotation);
    scaleRange.value = String(hit.scale.toFixed(2));
    bringToFront(hit.id); // auto bring to front on select
    dragState = { id: hit.id, startX: x, startY: y, origX: hit.x, origY: hit.y };
    canvas.style.cursor = 'grabbing';
  } else {
    selectedId = null;
  }
  scheduleDraw();
});

window.addEventListener('mousemove', (e)=>{
  if(!dragState) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left);
  const y = (e.clientY - rect.top);
  const s = getStickerById(dragState.id);
  if(!s) return;
  const dx = x - dragState.startX;
  const dy = y - dragState.startY;
  s.x = dragState.origX + dx;
  s.y = dragState.origY + dy;
  scheduleDraw();
});

window.addEventListener('mouseup', ()=>{
  dragState = null;
  canvas.style.cursor = 'grab';
});

canvas.addEventListener('wheel', (e)=>{
  if(!selectedId) return;
  e.preventDefault();
  const s = getStickerById(selectedId);
  if(!s) return;
  const factor = e.shiftKey ? 0.01 : 0.05; // fine control with shift
  const delta = e.deltaY > 0 ? -factor : factor;
  s.scale = Math.max(0.05, Math.min(8, s.scale + delta));
  scaleRange.value = String(s.scale.toFixed(2));
  scheduleDraw();
}, { passive:false });

window.addEventListener('keydown', (e)=>{
  if(!selectedId) return;
  const s = getStickerById(selectedId);
  if(!s) return;
  if(e.key.toLowerCase() === 'q'){ s.rotation -= 5; rotateDial.value = String(s.rotation); scheduleDraw(); }
  if(e.key.toLowerCase() === 'e'){ s.rotation += 5; rotateDial.value = String(s.rotation); scheduleDraw(); }
  if(e.key === 'Delete' || e.key === 'Backspace'){ deleteSelected(); }
});

// UI bindings
fileInput.addEventListener('change', async (e)=>{
  const files = Array.from(e.target.files || []);
  for(const f of files){
    if(!f.type.startsWith('image/')) continue;
    const img = await loadImageFile(f);
    const st = createImageSticker(img);
    // Initial placement slightly staggered
    st.x = (stickers.length % 3) * 280 + 200;
    st.y = Math.floor(stickers.length / 3) * 280 + 200;
    stickers.push(st);
  }
  if(stickers.length > 0){
    selectedId = stickers[stickers.length - 1].id;
  }
  scheduleDraw();
  // reset input so selecting same files again triggers change
  fileInput.value = '';
});

btnAuto.addEventListener('click', ()=>{
  autoArrange();
  scheduleDraw();
});

rotateDial.addEventListener('input', ()=>{
  if(!selectedId) return;
  const s = getStickerById(selectedId);
  if(!s) return;
  s.rotation = Number(rotateDial.value) || 0;
  scheduleDraw();
});

scaleRange.addEventListener('input', ()=>{
  if(!selectedId) return;
  const s = getStickerById(selectedId);
  if(!s) return;
  s.scale = Number(scaleRange.value) || s.scale;
  scheduleDraw();
});

btnDelete.addEventListener('click', deleteSelected);
function deleteSelected(){
  if(!selectedId) return;
  const i = stickers.findIndex(s => s.id === selectedId);
  if(i >= 0){ stickers.splice(i, 1); selectedId = null; scheduleDraw(); }
}

btnFront.addEventListener('click', ()=>{
  if(selectedId){ bringToFront(selectedId); scheduleDraw(); }
});
btnBack.addEventListener('click', ()=>{
  if(selectedId){ sendToBack(selectedId); scheduleDraw(); }
});

btnAddText.addEventListener('click', ()=>{
  const value = textInput.value.trim();
  if(!value) return;
  const st = createTextSticker(value, fontSelect.value, Number(fontSize.value)||36, textColor.value||'#111');
  // Slight offset from center to avoid exact overlap
  st.x += Math.random()*40 - 20;
  st.y += Math.random()*40 - 20;
  stickers.push(st);
  selectedId = st.id;
  rotateDial.value = '0';
  scaleRange.value = '1';
  scheduleDraw();
});

outlineToggle.addEventListener('change', ()=> scheduleDraw());
outlineSize.addEventListener('input', ()=> scheduleDraw());

btnDownload.addEventListener('click', ()=>{
  // render current state to PNG
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sticker-bundle.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
});

btnPrint.addEventListener('click', ()=>{
  const url = canvas.toDataURL('image/png');
  const w = window.open('', 'printWindow');
  if(!w) return;
  w.document.write(`
    <html><head><title>Print Stickers</title>
    <style>
      @page { margin: 10mm; }
      body{ margin:0; display:flex; align-items:center; justify-content:center; }
      img{ max-width:100%; height:auto; }
    </style>
    </head><body>
      <img src="${url}" onload="window.focus(); window.print();"/>
    </body></html>
  `);
  w.document.close();
});

// Canvas size controls
btnResizeCanvas.addEventListener('click', ()=>{
  const w = Math.max(200, Number(canvasW.value) || canvas.width);
  const h = Math.max(200, Number(canvasH.value) || canvas.height);
  canvas.width = w; canvas.height = h;
  scheduleDraw();
});

// ====== Layout ======
function autoArrange(){
  const pad = 40; // outer padding
  const gap = 30;
  const cols = Math.max(1, Math.floor((canvas.width - pad*2 + gap) / (260 + gap)));
  let x = pad, y = pad;
  let col = 0;

  for(const s of stickers){
    // Normalize scale so sticker target size ~ 220px major axis
    const major = Math.max(s.w, s.h);
    const target = 220;
    s.scale = Math.min(4, Math.max(0.1, target / major));
    s.rotation = 0;
    s.x = x + 130; // cell center approx
    s.y = y + 130;

    col++;
    if(col >= cols){
      col = 0; x = pad; y += 260 + gap;
    } else {
      x += 260 + gap;
    }
  }
}

// ====== Utils ======
function loadImageFile(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Initial draw
scheduleDraw();
