const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("fileInput");

// FAB menu
const fabMenu = document.querySelector(".fab-menu");
const fabMain = document.querySelector(".fab-main");
fabMain.addEventListener("click", () => fabMenu.classList.toggle("open"));

// Buttons
const btnGrid = document.getElementById("btnLayoutGrid");
const btnCircle = document.getElementById("btnLayoutCircle");
const btnCollage = document.getElementById("btnLayoutCollage");
const btnCompressIn = document.getElementById("btnCompressIn");
const btnCompressOut = document.getElementById("btnCompressOut");
const btnZoomIn = document.getElementById("btnZoomIn");
const btnZoomOut = document.getElementById("btnZoomOut");
const btnDownload = document.getElementById("btnDownload");
const btnPrint = document.getElementById("btnPrint");
const btnShare = document.getElementById("btnShare");

let stickers = [];
let spacingFactor = 1; // compression controller
let zoomFactor = 1;

// Sticker object
function createSticker(img) {
  return {
    img,
    x: canvas.width / 2,
    y: canvas.height / 2,
    w: img.width,
    h: img.height,
  };
}

// Upload
fileInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files || []);
  for (const file of files) {
    const img = await loadImageFile(file);
    stickers.push(createSticker(img));
  }
  arrangeGrid();
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
  const cellW = (canvas.width / cols) * spacingFactor;
  const cellH = (canvas.height / rows) * spacingFactor;
  stickers.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    s.x = col * cellW + cellW / 2;
    s.y = row * cellH + cellH / 2;
    const scale = Math.min(cellW * 0.7 / s.w, cellH * 0.7 / s.h);
    s.w = s.img.width * scale;
    s.h = s.img.height * scale;
  });
  draw();
}

function arrangeCircle() {
  if (stickers.length === 0) return;
  const radius = (Math.min(canvas.width, canvas.height) / 3) * spacingFactor;
  stickers.forEach((s, i) => {
    const angle = (i / stickers.length) * Math.PI * 2;
    s.x = canvas.width / 2 + Math.cos(angle) * radius;
    s.y = canvas.height / 2 + Math.sin(angle) * radius;
    const scale = 150 / Math.max(s.img.width, s.img.height);
    s.w = s.img.width * scale;
    s.h = s.img.height * scale;
  });
  draw();
}

function arrangeCollage() {
  if (stickers.length === 0) return;
  stickers.forEach((s) => {
    s.x = (Math.random() * canvas.width) / spacingFactor;
    s.y = (Math.random() * canvas.height) / spacingFactor;
    const scale = 120 / Math.max(s.img.width, s.img.height);
    s.w = s.img.width * scale;
    s.h = s.img.height * scale;
  });
  draw();
}

// Compress In/Out
btnCompressIn.addEventListener("click", () => {
  spacingFactor *= 0.9;
  arrangeGrid();
});
btnCompressOut.addEventListener("click", () => {
  spacingFactor *= 1.1;
  arrangeGrid();
});

// Zoom
function zoomAll(factor) {
  zoomFactor *= factor;
  stickers.forEach((s) => {
    s.x = canvas.width / 2 + (s.x - canvas.width / 2) * factor;
    s.y = canvas.height / 2 + (s.y - canvas.height / 2) * factor;
    s.w *= factor;
    s.h *= factor;
  });
  draw();
}
btnZoomIn.addEventListener("click", () => zoomAll(1.1));
btnZoomOut.addEventListener("click", () => zoomAll(0.9));

// Draw
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  stickers.forEach((s) => {
    ctx.drawImage(s.img, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
  });
}

// Export
btnDownload.addEventListener("click", () => {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "kai-sticker-bundle.png";
  a.click();
});

btnPrint.addEventListener("click", () => {
  const url = canvas.toDataURL("image/png");
  const w = window.open("", "printWindow");
  w.document.write(`<img src="${url}" style="width:100%">`);
  w.print();
});

btnShare.addEventListener("click", async () => {
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  const file = new File([blob], "kai-sticker.png", { type: "image/png" });
  if (navigator.share) {
    navigator.share({
      title: "Kai Sticker Maker",
      text: "Check out my sticker bundle!",
      files: [file],
    }).catch(console.error);
  } else {
    alert("Sharing not supported on this device.");
  }
});

// Layout bindings
btnGrid.addEventListener("click", arrangeGrid);
btnCircle.addEventListener("click", arrangeCircle);
btnCollage.addEventListener("click", arrangeCollage);
