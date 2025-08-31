const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("fileInput");

// Buttons
const btnGrid = document.getElementById("btnLayoutGrid");
const btnCircle = document.getElementById("btnLayoutCircle");
const btnCollage = document.getElementById("btnLayoutCollage");
const btnZoomIn = document.getElementById("btnZoomIn");
const btnZoomOut = document.getElementById("btnZoomOut");
const btnSave = document.getElementById("btnSave");
const btnLoad = document.getElementById("btnLoad");
const btnDownload = document.getElementById("btnDownload");
const btnPrint = document.getElementById("btnPrint");
const btnShare = document.getElementById("btnShare");

let stickers = [];
let selectedSticker = null;

// For gestures
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let pinchStartDist = null;

// Sticker object
function createSticker(img, x, y, w, h) {
  if (!x && !y && !w && !h) {
    const scale = 200 / Math.max(img.width, img.height);
    w = img.width * scale;
    h = img.height * scale;
    x = canvas.width / 2;
    y = canvas.height / 2;
  }
  return { img, x, y, w, h, src: img.src };
}

// Upload images
fileInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files || []);
  for (const file of files) {
    const img = await loadImageFile(file);
    stickers.push(createSticker(img));
  }
  arrangeGrid();
  draw();
  fileInput.value = "";
});

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Layouts
function arrangeGrid() {
  if (stickers.length === 0) return;
  const cols = Math.ceil(Math.sqrt(stickers.length));
  const rows = Math.ceil(stickers.length / cols);
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;
  stickers.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    s.x = col * cellW + cellW / 2;
    s.y = row * cellH + cellH / 2;
    const scale = Math.min(cellW * 0.7 / s.w, cellH * 0.7 / s.h);
    s.w *= scale;
    s.h *= scale;
  });
  draw();
}

function arrangeCircle() {
  if (stickers.length === 0) return;
  const radius = Math.min(canvas.width, canvas.height) / 3;
  stickers.forEach((s, i) => {
    const angle = (i / stickers.length) * Math.PI * 2;
    s.x = canvas.width / 2 + Math.cos(angle) * radius;
    s.y = canvas.height / 2 + Math.sin(angle) * radius;
    const scale = 150 / Math.max(s.w, s.h);
    s.w *= scale;
    s.h *= scale;
  });
  draw();
}

function arrangeCollage() {
  if (stickers.length === 0) return;
  stickers.forEach((s) => {
    s.x = Math.random() * canvas.width;
    s.y = Math.random() * canvas.height;
    const scale = 120 / Math.max(s.w, s.h);
    s.w *= scale;
    s.h *= scale;
  });
  draw();
}

// Zoom controls
function zoomAll(factor) {
  stickers.forEach((s) => {
    s.x = canvas.width / 2 + (s.x - canvas.width / 2) * factor;
    s.y = canvas.height / 2 + (s.y - canvas.height / 2) * factor;
    s.w *= factor;
    s.h *= factor;
  });
  draw();
}

// Draw
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  stickers.forEach((s) => {
    ctx.drawImage(s.img, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
    if (s === selectedSticker) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.strokeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
    }
  });
}

// Touch Gestures
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const x = touch.clientX - canvas.getBoundingClientRect().left;
    const y = touch.clientY - canvas.getBoundingClientRect().top;
    selectedSticker = stickers.find(
      (s) => x > s.x - s.w / 2 && x < s.x + s.w / 2 && y > s.y - s.h / 2 && y < s.y + s.h / 2
    );
    if (selectedSticker) {
      isDragging = true;
      dragOffset.x = x - selectedSticker.x;
      dragOffset.y = y - selectedSticker.y;
    }
  } else if (e.touches.length === 2) {
    pinchStartDist = getTouchDist(e.touches);
  }
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length === 1 && isDragging && selectedSticker) {
    const touch = e.touches[0];
    const x = touch.clientX - canvas.getBoundingClientRect().left;
    const y = touch.clientY - canvas.getBoundingClientRect().top;
    selectedSticker.x = x - dragOffset.x;
    selectedSticker.y = y - dragOffset.y;
    draw();
  } else if (e.touches.length === 2 && pinchStartDist) {
    const newDist = getTouchDist(e.touches);
    const factor = newDist / pinchStartDist;
    zoomAll(factor);
    pinchStartDist = newDist;
  }
}, { passive: false });

canvas.addEventListener("touchend", () => {
  isDragging = false;
  pinchStartDist = null;
});

function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Save & Load Project
btnSave.addEventListener("click", () => {
  const saveData = stickers.map(s => ({
    src: s.src,
    x: s.x,
    y: s.y,
    w: s.w,
    h: s.h
  }));
  localStorage.setItem("kaiStickerProject", JSON.stringify(saveData));
  alert("Project saved!");
});

btnLoad.addEventListener("click", async () => {
  const data = JSON.parse(localStorage.getItem("kaiStickerProject") || "[]");
  if (!data.length) return alert("No saved project found.");
  stickers = [];
  for (const d of data) {
    const img = await loadImageFileFromSrc(d.src);
    stickers.push(createSticker(img, d.x, d.y, d.w, d.h));
  }
  draw();
  alert("Project loaded!");
});

function loadImageFileFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Export
btnDownload.addEventListener("click", () => {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "sticker-bundle.png";
  a.click();
});

btnPrint.addEventListener("click", () => {
  const url = canvas.toDataURL("image/png");
  const w = window.open("", "printWindow");
  w.document.write(`<img src="${url}" style="max-width:100%">`);
  w.print();
});

btnShare.addEventListener("click", async () => {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const file = new File([blob], "sticker-bundle.png", { type: "image/png" });
  if (navigator.share) {
    navigator.share({
      title: "Kai Sticker Maker",
      text: "Check out my sticker bundle!",
      files: [file],
    }).catch(console.error);
  } else {
    alert("Sharing not supported on this browser. Please download instead.");
  }
});

// Layout buttons
btnGrid.addEventListener("click", arrangeGrid);
btnCircle.addEventListener("click", arrangeCircle);
btnCollage.addEventListener("click", arrangeCollage);
btnZoomIn.addEventListener("click", () => zoomAll(1.1));
btnZoomOut.addEventListener("click", () => zoomAll(0.9));
