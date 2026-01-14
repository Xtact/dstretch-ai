// ULTRA SIMPLE VERSION - NO COMPLEXITY

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const loadingOverlay = document.getElementById('loadingOverlay');

let currentImage = null;

// FILE INPUT
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        loadImage(file);
    }
});

// LOAD IMAGE
function loadImage(file) {
    loadingOverlay.style.display = 'flex';
    uploadArea.style.display = 'none';
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            currentImage = img;
            
            // Size canvas
            const container = document.getElementById('canvasContainer');
            const maxW = container.clientWidth;
            const maxH = container.clientHeight;
            const ratio = img.width / img.height;
            
            if (ratio > maxW / maxH) {
                canvas.width = maxW;
                canvas.height = maxW / ratio;
            } else {
                canvas.height = maxH;
                canvas.width = maxH * ratio;
            }
            
            // Draw image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Show canvas
            canvas.style.display = 'block';
            document.getElementById('zoomControls').style.display = 'flex';
            document.getElementById('downloadBtn').disabled = false;
            document.getElementById('autoEnhanceBtn').disabled = false;
            
            loadingOverlay.style.display = 'none';
        };
        
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// TABS
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.panel + 'Panel').classList.add('active');
    });
});

// DOWNLOAD
document.getElementById('downloadBtn').addEventListener('click', function() {
    if (canvas.width > 0) {
        const link = document.createElement('a');
        link.download = 'dstretch-' + Date.now() + '.png';
        link.href = canvas.toDataURL();
        link.click();
    }
});

// SLIDERS
document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', function() {
        document.getElementById(this.id + 'Value').textContent = this.value;
        if (currentImage) applyAdjustments();
    });
});

// APPLY ADJUSTMENTS
function applyAdjustments() {
    if (!currentImage) return;
    
    const brightness = parseInt(document.getElementById('brightness').value);
    const contrast = parseInt(document.getElementById('contrast').value);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`;
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
}

// RESET
document.getElementById('resetBtn').addEventListener('click', function() {
    document.getElementById('brightness').value = 0;
    document.getElementById('brightnessValue').textContent = '0';
    document.getElementById('contrast').value = 0;
    document.getElementById('contrastValue').textContent = '0';
    if (currentImage) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    }
});

// ZOOM
let zoom = 1;
let panX = 0;
let panY = 0;

document.getElementById('zoomInBtn').addEventListener('click', function() {
    zoom = Math.min(zoom * 1.3, 5);
    redraw();
    document.getElementById('zoomPercent').textContent = Math.round(zoom * 100) + '%';
});

document.getElementById('zoomOutBtn').addEventListener('click', function() {
    zoom = Math.max(zoom / 1.3, 1);
    if (zoom === 1) { panX = 0; panY = 0; }
    redraw();
    document.getElementById('zoomPercent').textContent = Math.round(zoom * 100) + '%';
});

document.getElementById('resetZoomBtn').addEventListener('click', function() {
    zoom = 1;
    panX = 0;
    panY = 0;
    redraw();
    document.getElementById('zoomPercent').textContent = '100%';
});

function redraw() {
    if (!currentImage) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2 + panX / zoom, -canvas.height / 2 + panY / zoom);
    ctx.filter = `brightness(${100 + parseInt(document.getElementById('brightness').value)}%) contrast(${100 + parseInt(document.getElementById('contrast').value)}%)`;
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    ctx.restore();
}

// PAN
let isPanning = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('mousedown', function(e) {
    if (zoom > 1) {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (isPanning) {
        panX += e.clientX - lastX;
        panY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        redraw();
    }
});

canvas.addEventListener('mouseup', function() {
    isPanning = false;
    canvas.style.cursor = zoom > 1 ? 'grab' : 'default';
});

canvas.addEventListener('mouseleave', function() {
    isPanning = false;
    canvas.style.cursor = zoom > 1 ? 'grab' : 'default';
});
