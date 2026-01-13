// DStretch Pro Plus+ - Complete Advanced Enhancement Suite
// Version: 2.0 - Full Feature Implementation
// NOTE: This is a corrected and self-contained version of script.js
// Focus: fix image loading (file input & drag/drop) and provide working stubs for processing & UI controls.

class DStretchProPlus {
    constructor() {
        // Core elements
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d', { willReadFrequently: true }) : null;

        // Image state
        this.originalImage = null; // HTMLImageElement of the original loaded image
        this.currentImage = null;  // HTMLImageElement used for display (may be processed)
        this.processedImageData = null;

        // History (undo/redo)
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 20;

        // Worker
        this.worker = null;

        // View state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;

        // Comparison state
        this.isComparing = false;
        this.compareTimeout = null;

        // Debounce for processing
        this.processingTimeout = null;
        this.processingDelay = 150;

        this.init();
    }

    init() {
        console.log('Initializing DStretch Pro Plus+...');
        this.setupWorker();
        this.setupEventListeners();
        this.updateUIState();
        console.log('Initialization complete');
    }

    setupWorker() {
        if (typeof Worker !== 'undefined') {
            try {
                // Worker file optional: keep init but don't require its presence for basic functionality
                this.worker = new Worker('worker.js');
                this.worker.onmessage = (e) => this.handleWorkerMessage && this.handleWorkerMessage(e);
                this.worker.onerror = (e) => console.error('Worker error:', e);
                console.log('Web Worker initialized');
            } catch (err) {
                console.warn('Worker not available:', err);
                this.worker = null;
            }
        }
    }

    setupEventListeners() {
        const imageInput = document.getElementById('imageInput');
        const uploadPrompt = document.getElementById('uploadPrompt');
        const imageWorkspace = document.getElementById('imageWorkspace');

        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    if (uploadPrompt) uploadPrompt.style.display = 'none';
                    imageInput.style.display = 'none';
                    // Use single canonical loader
                    this.loadImage(file);
                }
            });
        }

        // Drag and drop - requires imageWorkspace
        if (imageWorkspace) {
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
                const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (file && file.type && file.type.startsWith('image/')) {
                    console.log('File dropped:', file.name);
                    this.loadImage(file);
                }
            });
        }

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.switchPanel(tab.dataset.panel);
            });
        });

        // Enhance & controls (guard elements)
        const dstretchToggle = document.getElementById('dstretchToggle');
        if (dstretchToggle) dstretchToggle.addEventListener('change', () => this.debouncedProcess());

        const colorspace = document.getElementById('colorspace');
        if (colorspace) colorspace.addEventListener('change', () => {
            if (dstretchToggle && dstretchToggle.checked) this.debouncedProcess();
        });

        const dstretchAmount = document.getElementById('dstretchAmount');
        if (dstretchAmount) {
            const dstretchAmountValue = document.getElementById('dstretchAmountValue');
            dstretchAmount.addEventListener('input', (e) => {
                if (dstretchAmountValue) dstretchAmountValue.textContent = e.target.value;
                if (dstretchToggle && dstretchToggle.checked) this.debouncedProcess();
            });
        }

        const icaToggle = document.getElementById('icaToggle');
        if (icaToggle) icaToggle.addEventListener('change', () => this.debouncedProcess());

        const autoEnhanceBtn = document.getElementById('autoEnhanceBtn');
        if (autoEnhanceBtn) autoEnhanceBtn.addEventListener('click', () => this.autoEnhance && this.autoEnhance());

        // Adjust panel sliders
        const adjustSliders = ['exposure', 'brightness', 'shadows', 'contrast', 'blackPoint', 'saturation', 'sharpness'];
        adjustSliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(`${id}Value`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    e.stopPropagation();
                    if (valueSpan) valueSpan.textContent = e.target.value;
                    this.debouncedProcess();
                });
            }
        });
        const resetAdjustments = document.getElementById('resetAdjustments');
        if (resetAdjustments) resetAdjustments.addEventListener('click', () => this.resetAdjustments && this.resetAdjustments());

        // Advanced sliders
        const advancedSliders = [
            'decorrelation', 'normalMap', 'lightAngle', 'lightIntensity',
            'edgeStrength', 'edgeThickness', 'directionalSharpen'
        ];
        advancedSliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(`${id}Value`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    e.stopPropagation();
                    if (valueSpan) valueSpan.textContent = e.target.value;
                    this.debouncedProcess();
                });
            }
        });
        const resetAdvanced = document.getElementById('resetAdvanced');
        if (resetAdvanced) resetAdvanced.addEventListener('click', () => this.resetAdvanced && this.resetAdvanced());

        // Tools
        const cameraBtn = document.getElementById('cameraBtn');
        if (cameraBtn) cameraBtn.addEventListener('click', () => this.openCamera && this.openCamera());

        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadImage());

        // Undo/Redo
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
        if (redoBtn) redoBtn.addEventListener('click', () => this.redo());

        // Zoom
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetZoomBtn = document.getElementById('resetZoomBtn');
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (resetZoomBtn) resetZoomBtn.addEventListener('click', () => this.resetZoom());

        // Pan handlers & comparison
        this.setupPanHandlers();
        this.setupComparisonHandlers();

        // Camera modal controls
        const closeCameraBtn = document.getElementById('closeCameraBtn');
        const cancelCameraBtn = document.getElementById('cancelCameraBtn');
        const captureBtn = document.getElementById('captureBtn');
        if (closeCameraBtn) closeCameraBtn.addEventListener('click', () => this.closeCamera && this.closeCamera());
        if (cancelCameraBtn) cancelCameraBtn.addEventListener('click', () => this.closeCamera && this.closeCamera());
        if (captureBtn) captureBtn.addEventListener('click', () => this.capturePhoto && this.capturePhoto());

        // Window resize -> keep canvas optimized
        let resizeTimeout;
        window.addEventListener('resize', () => {
            if (this.originalImage) {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.setupCanvas();
                    this.drawCanvas();
                }, 250);
            }
        });
    }

    // Canonical loader used by both file input and drag/drop
    loadImage(file) {
        const uploadPrompt = document.getElementById('uploadPrompt');
        const imageInput = document.getElementById('imageInput');

        if (uploadPrompt) uploadPrompt.style.display = 'none';
        if (imageInput) imageInput.style.display = 'none';

        this.showLoading(true, 'Loading image...');

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;

                // Reset view & canvas, draw image
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
                if (uploadPrompt) uploadPrompt.style.display = 'flex';
                if (imageInput) imageInput.style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            alert('Failed to read file');
            this.showLoading(false);
            if (uploadPrompt) uploadPrompt.style.display = 'flex';
            if (imageInput) imageInput.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    setupCanvas() {
        if (!this.canvas || !this.originalImage) return;

        const container = document.getElementById('imageWorkspace');
        const containerWidth = container ? container.clientWidth : this.originalImage.width;
        const containerHeight = container ? container.clientHeight : this.originalImage.height;

        const imgAspect = this.originalImage.width / this.originalImage.height;
        const containerAspect = containerWidth / containerHeight;

        if (imgAspect > containerAspect) {
            this.canvas.width = containerWidth;
            this.canvas.height = Math.round(containerWidth / imgAspect);
        } else {
            this.canvas.height = containerHeight;
            this.canvas.width = Math.round(containerHeight * imgAspect);
        }

        // Reset pan to center
        this.panX = 0;
        this.panY = 0;
        this.canvas.style.display = 'block';
    }

    drawCanvas() {
        if (!this.canvas || !this.ctx || !this.currentImage) return;

        this.canvas.classList.add('loaded');

        // Reset transform
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        // center, scale, pan
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.canvas.width / 2 + this.panX / this.zoom, -this.canvas.height / 2 + this.panY / this.zoom);
        // draw image stretched to canvas dimensions
        this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // update zoom percent UI if present
        const zoomPercent = document.getElementById('zoomPercent');
        if (zoomPercent) zoomPercent.textContent = Math.round(this.zoom * 100) + '%';
    }

    debouncedProcess() {
        clearTimeout(this.processingTimeout);
        this.processingTimeout = setTimeout(() => {
            this.processImage();
        }, this.processingDelay);
    }

    async processImage() {
        if (!this.originalImage) return;

        this.showLoading(true, 'Processing image...');

        try {
            // Create temp canvas at original image resolution
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.originalImage.width;
            tempCanvas.height = this.originalImage.height;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            tempCtx.drawImage(this.originalImage, 0, 0);

            let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

            const params = this.getProcessingParameters();

            if (params.decorrelation > 0) {
                imageData = this.applyDecorrelationStretch(imageData, params.decorrelation / 100);
            }

            imageData = this.applyStandardAdjustments(imageData, params);

            if (params.normalMap > 0 || params.edgeStrength > 0 || params.directionalSharpen > 0) {
                imageData = await this.applyAdvancedEnhancements(imageData, params);
            }

            // Placeholder for actual dstretch - keep default pass-through to avoid blocking
            if (params.dstretchEnabled) {
                imageData = await this.applyDStretch(imageData, params);
            }

            tempCtx.putImageData(imageData, 0, 0);

            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.processedImageData = imageData;
                this.drawCanvas();
                this.saveState();
                this.showLoading(false);
            };
            img.src = tempCanvas.toDataURL();

        } catch (error) {
            console.error('Processing error:', error);
            this.showLoading(false);
            alert('Error processing image: ' + (error && error.message ? error.message : error));
        }
    }

    getProcessingParameters() {
        const getVal = (id, fallback = 0) => {
            const el = document.getElementById(id);
            if (!el) return fallback;
            const v = parseInt(el.value);
            return Number.isNaN(v) ? fallback : v;
        };

        return {
            // DStretch
            dstretchEnabled: !!document.getElementById('dstretchToggle') && document.getElementById('dstretchToggle').checked,
            colorspace: (document.getElementById('colorspace') && document.getElementById('colorspace').value) || 'RGB',
            dstretchAmount: (document.getElementById('dstretchAmount') && parseInt(document.getElementById('dstretchAmount').value) / 100) || 0,
            useICA: !!document.getElementById('icaToggle') && document.getElementById('icaToggle').checked,

            // Standard adjustments
            exposure: getVal('exposure', 0),
            brightness: getVal('brightness', 0),
            shadows: getVal('shadows', 0),
            contrast: getVal('contrast', 0),
            blackPoint: getVal('blackPoint', 0),
            saturation: getVal('saturation', 0),
            sharpness: getVal('sharpness', 0),

            // Advanced
            decorrelation: getVal('decorrelation', 0),
            normalMap: getVal('normalMap', 0),
            lightAngle: getVal('lightAngle', 0),
            lightIntensity: getVal('lightIntensity', 50),
            edgeStrength: getVal('edgeStrength', 0),
            edgeThickness: getVal('edgeThickness', 1),
            directionalSharpen: getVal('directionalSharpen', 0)
        };
    }

    // ----- Image processing helpers (kept reasonably simple and robust) -----

    applyDecorrelationStretch(imageData, amount) {
        // Basic per-channel mean/std stretch blended by amount
        const data = imageData.data;
        const pixels = data.length / 4;
        const means = [0, 0, 0];
        const stds = [0, 0, 0];

        for (let i = 0; i < data.length; i += 4) {
            means[0] += data[i];
            means[1] += data[i + 1];
            means[2] += data[i + 2];
        }
        means[0] /= pixels; means[1] /= pixels; means[2] /= pixels;

        for (let i = 0; i < data.length; i += 4) {
            stds[0] += Math.pow(data[i] - means[0], 2);
            stds[1] += Math.pow(data[i + 1] - means[1], 2);
            stds[2] += Math.pow(data[i + 2] - means[2], 2);
        }
        stds[0] = Math.sqrt(stds[0] / pixels) || 1;
        stds[1] = Math.sqrt(stds[1] / pixels) || 1;
        stds[2] = Math.sqrt(stds[2] / pixels) || 1;

        for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                const v = data[i + c];
                const normalized = (v - means[c]) / stds[c];
                const stretched = normalized * 64 + means[c]; // small heuristic stretch
                const blended = stretched * amount + v * (1 - amount);
                data[i + c] = Math.max(0, Math.min(255, blended));
            }
        }
        return imageData;
    }

    applyStandardAdjustments(imageData, params) {
        const data = imageData.data;
        const { exposure, brightness, shadows, contrast, blackPoint, saturation, sharpness } = params;

        const exposureFactor = Math.pow(2, exposure / 100);
        const brightnessFactor = brightness / 100;
        const shadowsFactor = shadows / 100;
        const contrastFactor = (contrast + 100) / 100;
        const saturationFactor = 1 + saturation / 100;
        const blackPointThreshold = blackPoint * 2.55;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Black point
            r = Math.max(0, r - blackPointThreshold);
            g = Math.max(0, g - blackPointThreshold);
            b = Math.max(0, b - blackPointThreshold);

            // Exposure
            r *= exposureFactor;
            g *= exposureFactor;
            b *= exposureFactor;

            // Brightness
            r += brightnessFactor * 255;
            g += brightnessFactor * 255;
            b += brightnessFactor * 255;

            // Shadows lift
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            if (luminance < 128) {
                const shadowBoost = (1 - luminance / 128) * shadowsFactor;
                r += r * shadowBoost;
                g += g * shadowBoost;
                b += b * shadowBoost;
            }

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

        // Sharpen (unsharp mask) if requested
        if (sharpness > 0) {
            return this.applyUnsharpMask(imageData, sharpness / 100);
        }

        return imageData;
    }

    applyUnsharpMask(imageData, amount = 0.5, radius = 1, threshold = 0) {
        // Very small and fast approximate unsharp mask: apply a simple kernel sharpen blended with original
        const width = imageData.width;
        const height = imageData.height;
        const src = imageData.data;
        const dst = new Uint8ClampedArray(src); // copy

        // simple 3x3 kernel sharpening
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;
                let k = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const sx = x + kx;
                        const sy = y + ky;
                        const si = (sy * width + sx) * 4;
                        const kval = kernel[k++];
                        r += src[si] * kval;
                        g += src[si + 1] * kval;
                        b += src[si + 2] * kval;
                    }
                }
                const idx = (y * width + x) * 4;
                dst[idx] = Math.max(0, Math.min(255, src[idx] * (1 - amount) + r * amount));
                dst[idx + 1] = Math.max(0, Math.min(255, src[idx + 1] * (1 - amount) + g * amount));
                dst[idx + 2] = Math.max(0, Math.min(255, src[idx + 2] * (1 - amount) + b * amount));
            }
        }

        imageData.data.set(dst);
        return imageData;
    }

    async applyAdvancedEnhancements(imageData, params) {
        const { normalMap, lightAngle, lightIntensity, edgeStrength, edgeThickness, directionalSharpen } = params;

        if (normalMap > 0) {
            const normals = this.generateNormalMap(imageData);
            imageData = this.applyNormalMapLighting(imageData, normals, lightAngle, lightIntensity / 100, normalMap / 100);
        }

        if (edgeStrength > 0) {
            const edges = this.detectEdges(imageData, edgeStrength / 100);
            if (edgeThickness > 1) this.dilateEdges(edges, edgeThickness);
            imageData = this.blendEdges(imageData, edges);
        }

        if (directionalSharpen > 0) {
            const edges = this.detectEdges(imageData, 0.5);
            imageData = this.applyDirectionalSharpen(imageData, edges, directionalSharpen / 100);
        }

        return imageData;
    }

    generateNormalMap(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const normals = new Float32Array(width * height * 3);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const tl = this.getLuminanceAt(imageData, x - 1, y - 1);
                const tc = this.getLuminanceAt(imageData, x, y - 1);
                const tr = this.getLuminanceAt(imageData, x + 1, y - 1);
                const ml = this.getLuminanceAt(imageData, x - 1, y);
                const mr = this.getLuminanceAt(imageData, x + 1, y);
                const bl = this.getLuminanceAt(imageData, x - 1, y + 1);
                const bc = this.getLuminanceAt(imageData, x, y + 1);
                const br = this.getLuminanceAt(imageData, x + 1, y + 1);

                const dx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
                const dy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);

                const nIdx = (y * width + x) * 3;
                const magnitude = Math.sqrt(dx * dx + dy * dy + 1);
                normals[nIdx] = -dx / magnitude;
                normals[nIdx + 1] = -dy / magnitude;
                normals[nIdx + 2] = 1 / magnitude;
            }
        }

        return normals;
    }

    applyNormalMapLighting(imageData, normalData, angle, intensity, strength) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        const angleRad = (angle * Math.PI) / 180;
        const lightDir = [Math.cos(angleRad), Math.sin(angleRad), 0.5];
        const lightMag = Math.sqrt(lightDir[0] * lightDir[0] + lightDir[1] * lightDir[1] + lightDir[2] * lightDir[2]);
        lightDir[0] /= lightMag; lightDir[1] /= lightMag; lightDir[2] /= lightMag;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const nIdx = (y * width + x) * 3;
                const nx = normalData[nIdx] || 0;
                const ny = normalData[nIdx + 1] || 0;
                const nz = normalData[nIdx + 2] || 1;
                const dot = nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2];
                const lighting = Math.max(0, dot) * intensity;
                for (let c = 0; c < 3; c++) {
                    const original = data[idx + c];
                    const lit = original * (1 + lighting);
                    data[idx + c] = Math.max(0, Math.min(255, original * (1 - strength) + lit * strength));
                }
            }
        }
        return imageData;
    }

    detectEdges(imageData, threshold) {
        const width = imageData.width;
        const height = imageData.height;
        const edges = new Uint8Array(width * height);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const gx =
                    -this.getLuminanceAt(imageData, x - 1, y - 1) +
                    this.getLuminanceAt(imageData, x + 1, y - 1) +
                    -2 * this.getLuminanceAt(imageData, x - 1, y) +
                    2 * this.getLuminanceAt(imageData, x + 1, y) +
                    -this.getLuminanceAt(imageData, x - 1, y + 1) +
                    this.getLuminanceAt(imageData, x + 1, y + 1);

                const gy =
                    -this.getLuminanceAt(imageData, x - 1, y - 1) +
                    -2 * this.getLuminanceAt(imageData, x, y - 1) +
                    -this.getLuminanceAt(imageData, x + 1, y - 1) +
                    this.getLuminanceAt(imageData, x - 1, y + 1) +
                    2 * this.getLuminanceAt(imageData, x, y + 1) +
                    this.getLuminanceAt(imageData, x + 1, y + 1);

                const mag = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = mag > threshold * 255 ? 255 : 0;
            }
        }
        return edges;
    }

    dilateEdges(edges, thickness) {
        // assume square width/height from container - we stored width/height separately in other methods
        // We'll require edges length to be width*height; compute width via canvas when available
        const width = this.originalImage ? this.originalImage.width : Math.sqrt(edges.length);
        const height = Math.floor(edges.length / width);
        const temp = new Uint8Array(edges);

        for (let t = 0; t < Math.max(0, thickness - 1); t++) {
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    if (temp[idx] > 0) {
                        edges[idx - 1] = 255;
                        edges[idx + 1] = 255;
                        edges[idx - width] = 255;
                        edges[idx + width] = 255;
                    }
                }
            }
            temp.set(edges);
        }
    }

    blendEdges(imageData, edges) {
        const data = imageData.data;
        for (let i = 0; i < edges.length; i++) {
            if (edges[i] > 0) {
                const idx = i * 4;
                const edgeStrength = edges[i] / 255;
                data[idx] = data[idx] * (1 - edgeStrength * 0.5);
                data[idx + 1] = data[idx + 1] * (1 - edgeStrength * 0.5);
                data[idx + 2] = data[idx + 2] * (1 - edgeStrength * 0.5);
            }
        }
        return imageData;
    }

    applyDirectionalSharpen(imageData, edges, strength) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const original = new Uint8ClampedArray(data);

        // simple sharpen kernel; blend only where edges exist
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const edgeIdx = y * width + x;
                if (!edges[edgeIdx]) continue; // only sharpen where edges detected

                let r = 0, g = 0, b = 0;
                let k = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const sx = x + kx;
                        const sy = y + ky;
                        const si = (sy * width + sx) * 4;
                        const kval = kernel[k++];
                        r += original[si] * kval;
                        g += original[si + 1] * kval;
                        b += original[si + 2] * kval;
                    }
                }
                const idx = (y * width + x) * 4;
                data[idx] = Math.max(0, Math.min(255, original[idx] * (1 - strength) + r * strength));
                data[idx + 1] = Math.max(0, Math.min(255, original[idx + 1] * (1 - strength) + g * strength));
                data[idx + 2] = Math.max(0, Math.min(255, original[idx + 2] * (1 - strength) + b * strength));
            }
        }
        return imageData;
    }

    // Placeholder: simple pass-through dStretch (real algorithm complex)
    async applyDStretch(imageData, params) {
        // For now, return the imageData unchanged. Keep async for backwards compatibility.
        return imageData;
    }

    // ----- Utilities -----

    getLuminanceAt(imageData, x, y) {
        const w = imageData.width;
        const h = imageData.height;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x >= w) x = w - 1;
        if (y >= h) y = h - 1;
        const idx = (y * w + x) * 4;
        const d = imageData.data;
        return 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
    }

    // ----- History (undo/redo) -----
    saveState() {
        if (!this.canvas) return;
        try {
            const dataURL = this.canvas.toDataURL();
            // If we're not at the tip of history, truncate forward history
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            this.history.push(dataURL);
            if (this.history.length > this.maxHistory) {
                this.history.shift();
            } else {
                this.historyIndex++;
            }
            this.updateUIState();
        } catch (err) {
            // toDataURL might fail in some cross-origin contexts; ignore silently
            console.warn('Failed to save state:', err);
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const url = this.history[this.historyIndex];
            this._loadImageFromDataURL(url);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const url = this.history[this.historyIndex];
            this._loadImageFromDataURL(url);
        }
    }

    _loadImageFromDataURL(dataURL) {
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.drawCanvas();
            this.updateUIState();
        };
        img.src = dataURL;
    }

    // ----- Zoom & Pan -----
    zoomIn() {
        this.zoom = Math.min(4, this.zoom * 1.25);
        this.drawCanvas();
    }

    zoomOut() {
        this.zoom = Math.max(0.25, this.zoom * 0.8);
        this.drawCanvas();
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        // update canvas sizing if we have an original image
        if (this.originalImage) this.setupCanvas();
        this.drawCanvas();
    }

    setupPanHandlers() {
        if (!this.canvas) return;

        // Mouse pan
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.zoom > 1 && e.button === 0) {
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

        const endPan = () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = this.zoom > 1 ? 'grab' : 'default';
            }
        };
        this.canvas.addEventListener('mouseup', endPan);
        this.canvas.addEventListener('mouseleave', endPan);

        // Touch pan
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
    }

    setupComparisonHandlers() {
        const workspace = document.getElementById('imageWorkspace');
        if (!workspace) return;

        // Mouse
        workspace.addEventListener('mousedown', (e) => {
            if (this.originalImage && !this.isPanning && e.button === 0) {
                e.stopPropagation();
                this.compareTimeout = setTimeout(() => {
                    this.showOriginal();
                }, 500);
            }
        });

        workspace.addEventListener('mouseup', (e) => {
            if (this.originalImage) {
                clearTimeout(this.compareTimeout);
                if (this.isComparing) this.hideOriginal();
            }
        });

        workspace.addEventListener('mouseleave', () => {
            if (this.originalImage) {
                clearTimeout(this.compareTimeout);
                if (this.isComparing) this.hideOriginal();
            }
        });

        // Touch
        workspace.addEventListener('touchstart', (e) => {
            if (this.originalImage && e.touches.length === 1) {
                e.stopPropagation();
                this.compareTimeout = setTimeout(() => {
                    this.showOriginal();
                }, 500);
            }
        });

        workspace.addEventListener('touchend', () => {
            if (this.originalImage) {
                clearTimeout(this.compareTimeout);
                if (this.isComparing) this.hideOriginal();
            }
        });
    }

    showOriginal() {
        if (!this.originalImage || !this.ctx || !this.canvas) return;
        this.isComparing = true;
        const overlay = document.getElementById('comparisonOverlay');
        if (overlay) overlay.classList.add('active');

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    hideOriginal() {
        this.isComparing = false;
        const overlay = document.getElementById('comparisonOverlay');
        if (overlay) overlay.classList.remove('active');
        this.drawCanvas();
    }

    // ----- UI helpers -----
    updateUIState() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const zoomControls = document.getElementById('zoomControls');

        if (undoBtn) undoBtn.disabled = !(this.historyIndex > 0);
        if (redoBtn) redoBtn.disabled = !(this.historyIndex < this.history.length - 1);
        if (downloadBtn) downloadBtn.disabled = !this.currentImage;
        if (zoomControls) zoomControls.style.display = this.currentImage ? 'flex' : 'none';
    }

    showLoading(show, message) {
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;
        if (show) {
            overlay.style.display = 'flex';
            const msgEl = overlay.querySelector('.message');
            if (msgEl && message) msgEl.textContent = message;
        } else {
            overlay.style.display = 'none';
        }
    }

    downloadImage() {
        if (!this.canvas) return;
        const link = document.createElement('a');
        link.download = 'dstretch-result.png';
        try {
            link.href = this.canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            alert('Download failed: ' + err.message);
        }
    }

    // Basic camera stubs (implementation depends on HTML modal & media APIs)
    openCamera() {
        const modal = document.getElementById('cameraModal');
        if (modal) modal.style.display = 'flex';
    }

    closeCamera() {
        const modal = document.getElementById('cameraModal');
        if (modal) modal.style.display = 'none';
    }

    capturePhoto() {
        // If camera implementation exists, capture and call loadImage with a Blob/File
        alert('Camera capture not implemented in this build.');
    }

    // Reset helpers
    resetAdjustments() {
        const ids = ['exposure', 'brightness', 'shadows', 'contrast', 'blackPoint', 'saturation', 'sharpness'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = el.getAttribute('data-default') || 0;
            const val = document.getElementById(`${id}Value`);
            if (val) val.textContent = el ? el.value : '0';
        });
        this.debouncedProcess();
    }

    resetAdvanced() {
        const ids = ['decorrelation', 'normalMap', 'lightAngle', 'lightIntensity', 'edgeStrength', 'edgeThickness', 'directionalSharpen'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = el.getAttribute('data-default') || 0;
            const val = document.getElementById(`${id}Value`);
            if (val) val.textContent = el ? el.value : '0';
        });
        this.debouncedProcess();
    }

    // Auto-enhance stub: simple example of toggling some sliders then processing
    autoEnhance() {
        const brightness = document.getElementById('brightness');
        const contrast = document.getElementById('contrast');
        if (brightness) brightness.value = 10;
        if (contrast) contrast.value = 10;
        // update UI values
        const bVal = document.getElementById('brightnessValue');
        if (bVal) bVal.textContent = brightness ? brightness.value : '10';
        const cVal = document.getElementById('contrastValue');
        if (cVal) cVal.textContent = contrast ? contrast.value : '10';
        this.debouncedProcess();
    }
}

// Instantiate when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Guard: only if a canvas exists on the page
    if (document.getElementById('mainCanvas')) {
        window.dstretchApp = new DStretchProPlus();
    } else {
        console.warn('DStretchProPlus: mainCanvas not found - skipping initialization.');
    }
});
