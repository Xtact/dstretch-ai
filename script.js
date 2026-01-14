// DStretch Pro Plus+ - COMPLETELY REBUILT FROM SCRATCH
// Based on working Firebase version analysis

console.log('Script loading...');

class DStretchProPlus {
    constructor() {
        console.log('Initializing DStretch Pro Plus+...');
        
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.originalImage = null;
        this.currentImage = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.history = [];
        this.historyIndex = -1;
        this.isComparing = false;
        this.compareTimeout = null;
        this.processingTimeout = null;
        this.processingDelay = 150;
        this.worker = null;
        this.maxHistory = 20;
        
        console.log('Canvas:', this.canvas);
        console.log('Context:', this.ctx);
        
        this.init();
    }

    init() {
        console.log('Setting up event listeners...');
        this.setupFileInput();
        this.setupUI();
        this.setupZoom();
        this.setupPan();
        console.log('Initialization complete');
    }

    setupFileInput() {
        const input = document.getElementById('imageInput');
        const prompt = document.getElementById('uploadPrompt');
        
        console.log('File input:', input);
        console.log('Upload prompt:', prompt);
        
        if (!input) {
            console.error('ERROR: imageInput not found!');
            return;
        }
        
        // File input change handler
        input.addEventListener('change', (e) => {
            console.log('File input changed!');
            const file = e.target.files[0];
            if (file) {
                console.log('File selected:', file.name, file.type, file.size);
                this.loadImageFromFile(file);
            } else {
                console.log('No file selected');
            }
        });
        
        // Drag and drop
        const workspace = document.getElementById('imageWorkspace');
        
        workspace.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            workspace.classList.add('drag-over');
        });
        
        workspace.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            workspace.classList.remove('drag-over');
        });
        
        workspace.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            workspace.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                console.log('File dropped:', file.name);
                this.loadImageFromFile(file);
            }
        });
        
        console.log('File input setup complete');
    }

    loadImageFromFile(file) {
        console.log('=== LOADING IMAGE ===');
        console.log('File:', file.name, file.type, file.size);
        
        // Hide upload UI
        const prompt = document.getElementById('uploadPrompt');
        const input = document.getElementById('imageInput');
        if (prompt) {
            prompt.style.display = 'none';
            console.log('Upload prompt hidden');
        }
        if (input) {
            input.style.display = 'none';
            console.log('File input hidden');
        }
        
        // Show loading
        this.showLoading(true);
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            console.log('File read complete, data length:', e.target.result.length);
            
            const img = new Image();
            
            img.onload = () => {
                console.log('Image loaded successfully!');
                console.log('Dimensions:', img.width, 'x', img.height);
                
                this.originalImage = img;
                this.currentImage = img;
                
                // Setup canvas
                this.setupCanvasSize(img);
                
                // Draw image
                this.drawImageToCanvas(img);
                
                // Reset zoom/pan
                this.zoom = 1;
                this.panX = 0;
                this.panY = 0;
                
                // Update UI
                this.updateUI();
                
                // Save initial state
                this.history = [this.canvas.toDataURL()];
                this.historyIndex = 0;
                
                // Hide loading
                this.showLoading(false);
                
                console.log('Image display complete!');
            };
            
            img.onerror = (err) => {
                console.error('Image load error:', err);
                alert('Failed to load image. Please try another file.');
                this.showLoading(false);
                if (prompt) prompt.style.display = 'flex';
                if (input) input.style.display = 'block';
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = (err) => {
            console.error('FileReader error:', err);
            alert('Failed to read file. Please try again.');
            this.showLoading(false);
            if (prompt) prompt.style.display = 'flex';
            if (input) input.style.display = 'block';
        };
        
        reader.readAsDataURL(file);
    }

    setupCanvasSize(img) {
        const workspace = document.getElementById('imageWorkspace');
        const maxWidth = workspace.clientWidth;
        const maxHeight = workspace.clientHeight;
        
        console.log('Workspace size:', maxWidth, 'x', maxHeight);
        
        const imgRatio = img.width / img.height;
        const containerRatio = maxWidth / maxHeight;
        
        if (imgRatio > containerRatio) {
            // Image is wider
            this.canvas.width = maxWidth;
            this.canvas.height = maxWidth / imgRatio;
        } else {
            // Image is taller
            this.canvas.height = maxHeight;
            this.canvas.width = maxHeight * imgRatio;
        }
        
        console.log('Canvas sized to:', this.canvas.width, 'x', this.canvas.height);
    }

    drawImageToCanvas(img) {
        console.log('Drawing image to canvas...');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.canvas.style.display = 'block';
        console.log('Image drawn');
    }

    updateUI() {
        const hasImage = this.originalImage !== null;
        
        document.getElementById('zoomControls').style.display = hasImage ? 'flex' : 'none';
        document.getElementById('downloadBtn').disabled = !hasImage;
        document.getElementById('autoEnhanceBtn').disabled = !hasImage;
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
        
        if (hasImage) {
            document.getElementById('zoomPercent').textContent = Math.round(this.zoom * 100) + '%';
        }
        
        console.log('UI updated, hasImage:', hasImage);
    }

    setupUI() {
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.panel + 'Panel').classList.add('active');
            });
        });
        
        // Download
        document.getElementById('downloadBtn').addEventListener('click', () => this.download());
        
        // Camera
        document.getElementById('cameraBtn').addEventListener('click', () => this.openCamera());
        document.getElementById('closeCameraBtn').addEventListener('click', () => this.closeCamera());
        document.getElementById('cancelCameraBtn').addEventListener('click', () => this.closeCamera());
        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
        
        // Undo/Redo
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        
        // Auto enhance
        document.getElementById('autoEnhanceBtn').addEventListener('click', () => this.autoEnhance());
        
        // Reset buttons
        document.getElementById('resetAdjustments').addEventListener('click', () => this.resetAdjustments());
        document.getElementById('resetAdvanced').addEventListener('click', () => this.resetAdvanced());
        
        // DStretch toggle
        document.getElementById('dstretchToggle').addEventListener('change', () => {
            if (this.originalImage) this.processImage();
        });
        
        // Colorspace
        document.getElementById('colorspace').addEventListener('change', () => {
            if (document.getElementById('dstretchToggle').checked && this.originalImage) {
                this.processImage();
            }
        });
        
        // All sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const valueSpan = document.getElementById(slider.id + 'Value');
            if (valueSpan) {
                slider.addEventListener('input', (e) => {
                    valueSpan.textContent = e.target.value;
                    if (this.originalImage) this.debouncedProcess();
                });
            }
        });
    }

    setupZoom() {
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetZoomBtn').addEventListener('click', () => this.resetZoom());
    }

    setupPan() {
        const canvas = this.canvas;
        
        // Mouse pan
        canvas.addEventListener('mousedown', (e) => {
            if (this.zoom > 1 && e.button === 0) {
                e.preventDefault();
                this.isPanning = true;
                this.lastPanX = e.clientX;
                this.lastPanY = e.clientY;
                canvas.style.cursor = 'grabbing';
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning && this.zoom > 1) {
                e.preventDefault();
                const dx = e.clientX - this.lastPanX;
                const dy = e.clientY - this.lastPanY;
                this.panX += dx;
                this.panY += dy;
                this.lastPanX = e.clientX;
                this.lastPanY = e.clientY;
                this.redraw();
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                canvas.style.cursor = this.zoom > 1 ? 'grab' : 'default';
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            if (this.isPanning) {
                this.isPanning = false;
                canvas.style.cursor = this.zoom > 1 ? 'grab' : 'default';
            }
        });
        
        // Touch pan
        canvas.addEventListener('touchstart', (e) => {
            if (this.zoom > 1 && e.touches.length === 1) {
                e.preventDefault();
                this.isPanning = true;
                this.lastPanX = e.touches[0].clientX;
                this.lastPanY = e.touches[0].clientY;
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            if (this.isPanning && this.zoom > 1 && e.touches.length === 1) {
                e.preventDefault();
                const dx = e.touches[0].clientX - this.lastPanX;
                const dy = e.touches[0].clientY - this.lastPanY;
                this.panX += dx;
                this.panY += dy;
                this.lastPanX = e.touches[0].clientX;
                this.lastPanY = e.touches[0].clientY;
                this.redraw();
            }
        });
        
        canvas.addEventListener('touchend', () => {
            this.isPanning = false;
        });
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.3, 5);
        this.redraw();
        this.updateUI();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.3, 1);
        if (this.zoom === 1) {
            this.panX = 0;
            this.panY = 0;
        }
        this.redraw();
        this.updateUI();
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.redraw();
        this.updateUI();
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

    debouncedProcess() {
        clearTimeout(this.processingTimeout);
        this.processingTimeout = setTimeout(() => {
            this.processImage();
        }, this.processingDelay);
    }

    processImage() {
        // Placeholder for processing - just redraw for now
        console.log('Processing image...');
        this.redraw();
    }

    resetAdjustments() {
        document.querySelectorAll('#adjustPanel input[type="range"]').forEach(slider => {
            slider.value = 0;
            const valueSpan = document.getElementById(slider.id + 'Value');
            if (valueSpan) valueSpan.textContent = '0';
        });
        if (this.originalImage) this.processImage();
    }

    resetAdvanced() {
        const defaults = {lightAngle: 45, lightIntensity: 50, edgeThickness: 1};
        document.querySelectorAll('#advancedPanel input[type="range"]').forEach(slider => {
            slider.value = defaults[slider.id] || 0;
            const valueSpan = document.getElementById(slider.id + 'Value');
            if (valueSpan) valueSpan.textContent = slider.value;
        });
        if (this.originalImage) this.processImage();
    }

    autoEnhance() {
        alert('Auto enhance coming soon!');
    }

    download() {
        if (!this.canvas.width) return;
        const link = document.createElement('a');
        link.download = `dstretch-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
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
            this.updateUI();
        };
        img.src = dataUrl;
    }

    async openCamera() {
        const modal = document.getElementById('cameraModal');
        const video = document.getElementById('cameraVideo');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            video.srcObject = stream;
            modal.classList.add('active');
        } catch (err) {
            alert('Could not access camera: ' + err.message);
        }
    }

    closeCamera() {
        const modal = document.getElementById('cameraModal');
        const video = document.getElementById('cameraVideo');
        
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        modal.classList.remove('active');
    }

    capturePhoto() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob(blob => {
            this.loadImageFromFile(blob);
            this.closeCamera();
        });
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }
}

// Initialize when ready
console.log('Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, creating app...');
        window.app = new DStretchProPlus();
    });
} else {
    console.log('DOM already loaded, creating app...');
    window.app = new DStretchProPlus();
}
