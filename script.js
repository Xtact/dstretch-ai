// DStretch Pro Plus+ - MINIMAL WORKING VERSION
// Stripped down to basics - just upload and display

class DStretchProPlus {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.originalImage = null;
        this.currentImage = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.history = [];
        this.historyIndex = -1;
        
        this.init();
    }

    init() {
        this.setupUpload();
        this.setupUI();
    }

    setupUpload() {
        const input = document.getElementById('imageInput');
        const workspace = document.getElementById('imageWorkspace');
        
        // Click workspace to upload
        workspace.onclick = () => {
            if (!this.originalImage) {
                input.click();
            }
        };
        
        // Handle file selection
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadImage(file);
            }
        };
    }

    loadImage(file) {
        // Show loading
        document.getElementById('loadingOverlay').classList.add('active');
        
        // Hide upload prompt
        document.getElementById('uploadPrompt').style.display = 'none';
        document.getElementById('imageInput').style.display = 'none';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                
                // Size canvas
                const workspace = document.getElementById('imageWorkspace');
                const maxW = workspace.clientWidth;
                const maxH = workspace.clientHeight;
                const ratio = img.width / img.height;
                
                if (ratio > maxW / maxH) {
                    this.canvas.width = maxW;
                    this.canvas.height = maxW / ratio;
                } else {
                    this.canvas.height = maxH;
                    this.canvas.width = maxH * ratio;
                }
                
                // Draw image
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                this.canvas.style.display = 'block';
                
                // Update UI
                document.getElementById('zoomControls').style.display = 'flex';
                document.getElementById('zoomPercent').textContent = '100%';
                document.getElementById('downloadBtn').disabled = false;
                document.getElementById('autoEnhanceBtn').disabled = false;
                
                // Hide loading
                document.getElementById('loadingOverlay').classList.remove('active');
                
                // Save to history
                this.history = [this.canvas.toDataURL()];
                this.historyIndex = 0;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    setupUI() {
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.panel + 'Panel').classList.add('active');
            };
        });
        
        // Download button
        document.getElementById('downloadBtn').onclick = () => {
            if (this.canvas.width) {
                const link = document.createElement('a');
                link.download = `dstretch-${Date.now()}.png`;
                link.href = this.canvas.toDataURL();
                link.click();
            }
        };
        
        // Camera button
        document.getElementById('cameraBtn').onclick = () => {
            alert('Camera feature coming soon!');
        };
        
        // Auto enhance
        document.getElementById('autoEnhanceBtn').onclick = () => {
            alert('Auto enhance feature coming soon!');
        };
        
        // Reset buttons
        document.getElementById('resetAdjustments').onclick = () => {
            document.querySelectorAll('#adjustPanel input[type="range"]').forEach(slider => {
                slider.value = 0;
                document.getElementById(slider.id + 'Value').textContent = '0';
            });
        };
        
        document.getElementById('resetAdvanced').onclick = () => {
            document.querySelectorAll('#advancedPanel input[type="range"]').forEach(slider => {
                const defaults = {lightAngle: 45, lightIntensity: 50, edgeThickness: 1};
                slider.value = defaults[slider.id] || 0;
                document.getElementById(slider.id + 'Value').textContent = slider.value;
            });
        };
        
        // Zoom controls
        document.getElementById('zoomInBtn').onclick = () => this.zoomIn();
        document.getElementById('zoomOutBtn').onclick = () => this.zoomOut();
        document.getElementById('resetZoomBtn').onclick = () => this.resetZoom();
        
        // Undo/Redo
        document.getElementById('undoBtn').onclick = () => this.undo();
        document.getElementById('redoBtn').onclick = () => this.redo();
        
        // Camera modal
        document.getElementById('closeCameraBtn').onclick = () => {
            document.getElementById('cameraModal').classList.remove('active');
        };
        document.getElementById('cancelCameraBtn').onclick = () => {
            document.getElementById('cameraModal').classList.remove('active');
        };
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.3, 5);
        this.redraw();
        document.getElementById('zoomPercent').textContent = Math.round(this.zoom * 100) + '%';
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.3, 1);
        if (this.zoom === 1) {
            this.panX = 0;
            this.panY = 0;
        }
        this.redraw();
        document.getElementById('zoomPercent').textContent = Math.round(this.zoom * 100) + '%';
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.redraw();
        document.getElementById('zoomPercent').textContent = '100%';
    }

    redraw() {
        if (!this.currentImage) return;
        
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.canvas.width / 2 + this.panX / this.zoom, -this.canvas.height / 2 + this.panY / this.zoom);
        this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadFromHistory(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.loadFromHistory(this.history[this.historyIndex]);
        }
    }

    loadFromHistory(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.redraw();
        };
        img.src = dataUrl;
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new DStretchProPlus());
} else {
    new DStretchProPlus();
}
