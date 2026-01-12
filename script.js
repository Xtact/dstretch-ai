// DStretch Pro Plus+ - Main Script
// Fixed: Upload functionality now works correctly

class DStretchApp {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.originalImage = null;
        this.currentImage = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 20;
        this.worker = null;
        
        // Zoom and pan state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        this.init();
    }

    init() {
        this.setupWorker();
        this.setupEventListeners();
        this.updateUIState();
    }

    setupWorker() {
        if (typeof Worker !== 'undefined') {
            try {
                this.worker = new Worker('worker.js');
                this.worker.onmessage = (e) => this.handleWorkerMessage(e);
                this.worker.onerror = (e) => console.error('Worker error:', e);
            } catch (err) {
                console.warn('Worker not available:', err);
            }
        }
    }

    setupEventListeners() {
        // === UPLOAD FUNCTIONALITY - SIMPLIFIED ===
        const imageWorkspace = document.getElementById('imageWorkspace');
        const imageInput = document.getElementById('imageInput');
        const uploadPrompt = imageWorkspace.querySelector('.upload-prompt');
        
        // Click anywhere in workspace to upload (when no image loaded)
        imageWorkspace.addEventListener('click', (e) => {
            // Only trigger upload if no image is loaded
            if (!this.originalImage) {
                // Prevent event from bubbling
                e.stopPropagation();
                imageInput.click();
            }
        });
        
        // File input change
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadImage(file);
            }
        });

        // Drag and drop
        imageWorkspace.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imageWorkspace.classList.add('drag-over');
        });

        imageWorkspace.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imageWorkspace.classList.remove('drag-over');
        });

        imageWorkspace.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imageWorkspace.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file);
            }
        });

        // === NAVIGATION TABS ===
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchPanel(tab.dataset.panel);
            });
        });

        // === ENHANCE PANEL ===
        document.getElementById('dstretchToggle').addEventListener('change', () => {
            this.applyEnhancements();
        });

        document.getElementById('colorspace').addEventListener('change', () => {
            if (document.getElementById('dstretchToggle').checked) {
                this.applyEnhancements();
            }
        });

        document.getElementById('autoEnhanceBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.autoEnhance();
        });

        // === ADJUST PANEL SLIDERS ===
        const sliders = ['exposure', 'contrast', 'saturation', 'sharpness'];
        sliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(`${id}Value`);
            
            slider.addEventListener('input', (e) => {
                e.stopPropagation();
                valueSpan.textContent = e.target.value;
                this.applyEnhancements();
            });
        });

        document.getElementById('resetAdjustments').addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetAdjustments();
        });

        // === ADVANCED PANEL ===
        document.getElementById('cameraBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openCamera();
        });

        document.getElementById('downloadBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadImage();
        });

        // === UNDO/REDO ===
        document.getElementById('undoBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.undo();
        });

        document.getElementById('redoBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.redo();
        });

        // === ZOOM CONTROLS ===
        document.getElementById('zoomInBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoomOut();
        });

        document.getElementById('resetZoomBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetZoom();
        });

        // === PAN FUNCTIONALITY (Only when zoomed) ===
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.zoom > 1) {
                e.preventDefault();
                this.isPanning = true;
                this.lastPanX = e.clientX;
                this.lastPanY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning && this.zoom > 1) {
                e.preventDefault();
                const dx = e.clientX - this.lastPanX;
                const dy = e.clientY - this.lastPanY;
                
                this.panX += dx;
                this.panY += dy;
                
                this.lastPanX = e.clientX;
                this.lastPanY = e.clientY;
                
                this.drawCanvas();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = this.zoom > 1 ? 'grab' : 'default';
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = this.zoom > 1 ? 'grab' : 'default';
            }
        });

        // Touch events for mobile pan
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.zoom > 1 && e.touches.length === 1) {
                e.preventDefault();
                this.isPanning = true;
                this.lastPanX = e.touches[0].clientX;
                this.lastPanY = e.touches[0].clientY;
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.isPanning && this.zoom > 1 && e.touches.length === 1) {
                e.preventDefault();
                const dx = e.touches[0].clientX - this.lastPanX;
                const dy = e.touches[0].clientY - this.lastPanY;
                
                this.panX += dx;
                this.panY += dy;
                
                this.lastPanX = e.touches[0].clientX;
                this.lastPanY = e.touches[0].clientY;
                
                this.drawCanvas();
            }
        });

        this.canvas.addEventListener('touchend', () => {
            this.isPanning = false;
        });

        // === CAMERA MODAL ===
        document.getElementById('closeCameraBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeCamera();
        });

        document.getElementById('cancelCameraBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeCamera();
        });

        document.getElementById('captureBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.capturePhoto();
        });
    }

    switchPanel(panelName) {
        // Update tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.panel === panelName);
        });

        // Update panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${panelName}Panel`);
        });
    }

    loadImage(file) {
        this.showLoading(true);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                this.resetZoom();
                this.setupCanvas();
                this.drawCanvas();
                this.saveState();
                this.updateUIState();
                this.showLoading(false);
            };
            img.onerror = () => {
                alert('Failed to load image');
                this.showLoading(false);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const imgAspect = this.originalImage.width / this.originalImage.height;
        const containerAspect = containerWidth / containerHeight;
        
        if (imgAspect > containerAspect) {
            this.canvas.width = containerWidth;
            this.canvas.height = containerWidth / imgAspect;
        } else {
            this.canvas.height = containerHeight;
            this.canvas.width = containerHeight * imgAspect;
        }
    }

    drawCanvas() {
        if (!this.currentImage) return;

        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.canvas.width / 2 + this.panX / this.zoom, -this.canvas.height / 2 + this.panY / this.zoom);
        
        ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
        
        ctx.restore();
    }

    applyEnhancements() {
        if (!this.originalImage) return;

        this.showLoading(true);

        const dstretchEnabled = document.getElementById('dstretchToggle').checked;
        const colorspace = document.getElementById('colorspace').value;
        const exposure = parseInt(document.getElementById('exposure').value);
        const contrast = parseInt(document.getElementById('contrast').value);
        const saturation = parseInt(document.getElementById('saturation').value);
        const sharpness = parseInt(document.getElementById('sharpness').value);

        // Create temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.originalImage.width;
        tempCanvas.height = this.originalImage.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(this.originalImage, 0, 0);

        let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        // Apply DStretch if enabled
        if (dstretchEnabled) {
            imageData = this.applyDStretch(imageData, colorspace);
        }

        // Apply adjustments
        imageData = this.applyAdjustments(imageData, {
            exposure,
            contrast,
            saturation,
            sharpness
        });

        tempCtx.putImageData(imageData, 0, 0);

        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.drawCanvas();
            this.saveState();
            this.showLoading(false);
        };
        img.src = tempCanvas.toDataURL();
    }

    applyDStretch(imageData, colorspace) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            let newR, newG, newB;

            switch (colorspace) {
                case 'yre': // Yellow-Red Enhancement
                    newR = Math.min(255, r * 1.3);
                    newG = Math.min(255, g * 1.1);
                    newB = b * 0.7;
                    break;
                case 'yye': // Yellow Enhancement
                    newR = Math.min(255, r * 1.2);
                    newG = Math.min(255, g * 1.2);
                    newB = b * 0.8;
                    break;
                case 'crgb': // Color RGB
                    newR = Math.min(255, (r - g - b + 510) / 2);
                    newG = Math.min(255, (g - r - b + 510) / 2);
                    newB = Math.min(255, (b - r - g + 510) / 2);
                    break;
                case 'lre': // Lab Red Enhancement
                    const l = 0.299 * r + 0.587 * g + 0.114 * b;
                    newR = Math.min(255, l * 0.5 + r * 0.5);
                    newG = g * 0.8;
                    newB = b * 0.8;
                    break;
                case 'lds': // Lab Desaturation
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    newR = gray;
                    newG = gray;
                    newB = gray;
                    break;
                default:
                    newR = r;
                    newG = g;
                    newB = b;
            }

            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
        }

        return imageData;
    }

    applyAdjustments(imageData, adjustments) {
        const data = imageData.data;
        const { exposure, contrast, saturation, sharpness } = adjustments;

        // Exposure, contrast, saturation
        const exposureFactor = 1 + exposure / 100;
        const contrastFactor = (contrast + 100) / 100;
        const saturationFactor = 1 + saturation / 100;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Exposure
            r *= exposureFactor;
            g *= exposureFactor;
            b *= exposureFactor;

            // Contrast
            r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
            g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
            b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

            // Saturation
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * saturationFactor;
            g = gray + (g - gray) * saturationFactor;
            b = gray + (b - gray) * saturationFactor;

            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        // Sharpness (if needed)
        if (sharpness > 0) {
            imageData = this.applySharpness(imageData, sharpness / 100);
        }

        return imageData;
    }

    applySharpness(imageData, amount) {
        // Simple unsharp mask
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const original = new Uint8ClampedArray(data);

        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += original[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    const idx = (y * width + x) * 4 + c;
                    data[idx] = original[idx] * (1 - amount) + sum * amount;
                }
            }
        }

        return imageData;
    }

    autoEnhance() {
        if (!this.originalImage) return;

        // Apply optimal settings
        document.getElementById('dstretchToggle').checked = true;
        document.getElementById('colorspace').value = 'yre';
        document.getElementById('contrast').value = '20';
        document.getElementById('contrastValue').textContent = '20';
        document.getElementById('saturation').value = '15';
        document.getElementById('saturationValue').textContent = '15';

        this.applyEnhancements();
    }

    resetAdjustments() {
        document.getElementById('exposure').value = '0';
        document.getElementById('exposureValue').textContent = '0';
        document.getElementById('contrast').value = '0';
        document.getElementById('contrastValue').textContent = '0';
        document.getElementById('saturation').value = '0';
        document.getElementById('saturationValue').textContent = '0';
        document.getElementById('sharpness').value = '0';
        document.getElementById('sharpnessValue').textContent = '0';

        this.applyEnhancements();
    }

    // Zoom controls
    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 5);
        this.drawCanvas();
        this.updateZoomUI();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 1);
        if (this.zoom === 1) {
            this.panX = 0;
            this.panY = 0;
        }
        this.drawCanvas();
        this.updateZoomUI();
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.drawCanvas();
        this.updateZoomUI();
    }

    updateZoomUI() {
        this.canvas.style.cursor = this.zoom > 1 ? 'grab' : 'default';
    }

    // History management
    saveState() {
        if (!this.currentImage) return;

        const state = this.canvas.toDataURL();
        
        // Remove any redo states
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        this.updateUIState();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadHistoryState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.loadHistoryState(this.history[this.historyIndex]);
        }
    }

    loadHistoryState(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.drawCanvas();
            this.updateUIState();
        };
        img.src = dataUrl;
    }

    // Camera functionality
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
            this.loadImage(blob);
            this.closeCamera();
        });
    }

    downloadImage() {
        if (!this.currentImage) return;

        const link = document.createElement('a');
        link.download = `dstretch-enhanced-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    handleWorkerMessage(e) {
        const { type, data } = e.data;
        
        if (type === 'enhanceComplete') {
            // Handle worker result if needed
        }
    }

    updateUIState() {
        const hasImage = this.originalImage !== null;
        const canUndo = this.historyIndex > 0;
        const canRedo = this.historyIndex < this.history.length - 1;

        document.getElementById('undoBtn').disabled = !canUndo;
        document.getElementById('redoBtn').disabled = !canRedo;
        document.getElementById('downloadBtn').disabled = !hasImage;
        document.getElementById('autoEnhanceBtn').disabled = !hasImage;
        
        document.getElementById('zoomControls').style.display = hasImage ? 'flex' : 'none';
        
        // Hide upload prompt when image is loaded
        const uploadPrompt = document.querySelector('.upload-prompt');
        if (uploadPrompt) {
            uploadPrompt.style.display = hasImage ? 'none' : 'flex';
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.toggle('active', show);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DStretchApp();
    });
} else {
    new DStretchApp();
}
