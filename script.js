// DStretch Pro Plus+ - Complete Advanced Enhancement Suite
// Version: 2.0 - Full Feature Implementation

class DStretchProPlus {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.originalImage = null;
        this.currentImage = null;
        this.processedImageData = null;
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
        
        // Comparison state
        this.isComparing = false;
        this.compareTimeout = null;
        
        // Processing debounce
        this.processingTimeout = null;
        this.processingDelay = 150; // ms
        
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
                this.worker = new Worker('worker.js');
                this.worker.onmessage = (e) => this.handleWorkerMessage(e);
                this.worker.onerror = (e) => console.error('Worker error:', e);
                console.log('Web Worker initialized');
            } catch (err) {
                console.warn('Worker not available:', err);
            }
        }
    }

    setupEventListeners() {
        // Upload functionality
        const imageWorkspace = document.getElementById('imageWorkspace');
        const imageInput = document.getElementById('imageInput');
        
        imageWorkspace.addEventListener('click', (e) => {
            if (!this.originalImage && !e.target.closest('button')) {
                e.stopPropagation();
                imageInput.click();
            }
        });
        
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadImage(file);
        });

        // Drag and drop
        imageWorkspace.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageWorkspace.classList.add('drag-over');
        });

        imageWorkspace.addEventListener('dragleave', (e) => {
            e.preventDefault();
            imageWorkspace.classList.remove('drag-over');
        });

        imageWorkspace.addEventListener('drop', (e) => {
            e.preventDefault();
            imageWorkspace.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file);
            }
        });

        // Tap and hold comparison
        this.setupComparisonHandlers();

        // Navigation tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchPanel(tab.dataset.panel);
            });
        });

        // Enhance panel
        document.getElementById('dstretchToggle').addEventListener('change', () => this.debouncedProcess());
        document.getElementById('colorspace').addEventListener('change', () => {
            if (document.getElementById('dstretchToggle').checked) {
                this.debouncedProcess();
            }
        });
        document.getElementById('dstretchAmount').addEventListener('input', (e) => {
            document.getElementById('dstretchAmountValue').textContent = e.target.value;
            if (document.getElementById('dstretchToggle').checked) {
                this.debouncedProcess();
            }
        });
        document.getElementById('icaToggle').addEventListener('change', () => this.debouncedProcess());
        document.getElementById('autoEnhanceBtn').addEventListener('click', () => this.autoEnhance());

        // Adjust panel sliders
        const adjustSliders = ['exposure', 'brightness', 'shadows', 'contrast', 'blackPoint', 'saturation', 'sharpness'];
        adjustSliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(`${id}Value`);
            slider.addEventListener('input', (e) => {
                e.stopPropagation();
                valueSpan.textContent = e.target.value;
                this.debouncedProcess();
            });
        });
        document.getElementById('resetAdjustments').addEventListener('click', () => this.resetAdjustments());

        // Advanced panel sliders
        const advancedSliders = [
            'decorrelation', 'normalMap', 'lightAngle', 'lightIntensity', 
            'edgeStrength', 'edgeThickness', 'directionalSharpen'
        ];
        advancedSliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(`${id}Value`);
            slider.addEventListener('input', (e) => {
                e.stopPropagation();
                valueSpan.textContent = e.target.value;
                this.debouncedProcess();
            });
        });
        document.getElementById('resetAdvanced').addEventListener('click', () => this.resetAdvanced());

        // Tools panel
        document.getElementById('cameraBtn').addEventListener('click', () => this.openCamera());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadImage());

        // Undo/Redo
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());

        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetZoomBtn').addEventListener('click', () => this.resetZoom());

        // Pan functionality
        this.setupPanHandlers();

        // Camera modal
        document.getElementById('closeCameraBtn').addEventListener('click', () => this.closeCamera());
        document.getElementById('cancelCameraBtn').addEventListener('click', () => this.closeCamera());
        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
    }

    setupComparisonHandlers() {
        const workspace = document.getElementById('imageWorkspace');
        const overlay = document.getElementById('comparisonOverlay');

        // Mouse events
        workspace.addEventListener('mousedown', (e) => {
            if (this.originalImage && !this.isPanning && e.button === 0) {
                this.compareTimeout = setTimeout(() => {
                    this.showOriginal();
                }, 500);
            }
        });

        workspace.addEventListener('mouseup', () => {
            clearTimeout(this.compareTimeout);
            if (this.isComparing) {
                this.hideOriginal();
            }
        });

        workspace.addEventListener('mouseleave', () => {
            clearTimeout(this.compareTimeout);
            if (this.isComparing) {
                this.hideOriginal();
            }
        });

        // Touch events
        workspace.addEventListener('touchstart', (e) => {
            if (this.originalImage && e.touches.length === 1) {
                this.compareTimeout = setTimeout(() => {
                    this.showOriginal();
                }, 500);
            }
        });

        workspace.addEventListener('touchend', () => {
            clearTimeout(this.compareTimeout);
            if (this.isComparing) {
                this.hideOriginal();
            }
        });
    }

    showOriginal() {
        if (!this.originalImage) return;
        this.isComparing = true;
        document.getElementById('comparisonOverlay').classList.add('active');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    hideOriginal() {
        this.isComparing = false;
        document.getElementById('comparisonOverlay').classList.remove('active');
        this.drawCanvas();
    }

    setupPanHandlers() {
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

    switchPanel(panelName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.panel === panelName);
        });
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${panelName}Panel`);
        });
    }

    loadImage(file) {
        this.showLoading(true, 'Loading image...');
        
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
                console.log('Image loaded:', img.width, 'x', img.height);
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
            // Create processing canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.originalImage.width;
            tempCanvas.height = this.originalImage.height;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            tempCtx.drawImage(this.originalImage, 0, 0);

            let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

            // Get all parameters
            const params = this.getProcessingParameters();

            // Processing pipeline
            if (params.decorrelation > 0) {
                imageData = this.applyDecorrelationStretch(imageData, params.decorrelation / 100);
            }

            imageData = this.applyStandardAdjustments(imageData, params);

            if (params.normalMap > 0 || params.edgeStrength > 0 || params.directionalSharpen > 0) {
                imageData = await this.applyAdvancedEnhancements(imageData, params);
            }

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
            alert('Error processing image: ' + error.message);
        }
    }

    getProcessingParameters() {
        return {
            // DStretch
            dstretchEnabled: document.getElementById('dstretchToggle').checked,
            colorspace: document.getElementById('colorspace').value,
            dstretchAmount: parseInt(document.getElementById('dstretchAmount').value) / 100,
            useICA: document.getElementById('icaToggle').checked,
            
            // Standard adjustments
            exposure: parseInt(document.getElementById('exposure').value),
            brightness: parseInt(document.getElementById('brightness').value),
            shadows: parseInt(document.getElementById('shadows').value),
            contrast: parseInt(document.getElementById('contrast').value),
            blackPoint: parseInt(document.getElementById('blackPoint').value),
            saturation: parseInt(document.getElementById('saturation').value),
            sharpness: parseInt(document.getElementById('sharpness').value),
            
            // Advanced
            decorrelation: parseInt(document.getElementById('decorrelation').value),
            normalMap: parseInt(document.getElementById('normalMap').value),
            lightAngle: parseInt(document.getElementById('lightAngle').value),
            lightIntensity: parseInt(document.getElementById('lightIntensity').value),
            edgeStrength: parseInt(document.getElementById('edgeStrength').value),
            edgeThickness: parseInt(document.getElementById('edgeThickness').value),
            directionalSharpen: parseInt(document.getElementById('directionalSharpen').value)
        };
    }

    applyDecorrelationStretch(imageData, amount) {
        const data = imageData.data;
        const pixels = data.length / 4;

        // Calculate mean and std dev for each channel
        const means = [0, 0, 0];
        const stdDevs = [0, 0, 0];

        for (let i = 0; i < data.length; i += 4) {
            means[0] += data[i];
            means[1] += data[i + 1];
            means[2] += data[i + 2];
        }

        means[0] /= pixels;
        means[1] /= pixels;
        means[2] /= pixels;

        for (let i = 0; i < data.length; i += 4) {
            stdDevs[0] += Math.pow(data[i] - means[0], 2);
            stdDevs[1] += Math.pow(data[i + 1] - means[1], 2);
            stdDevs[2] += Math.pow(data[i + 2] - means[2], 2);
        }

        stdDevs[0] = Math.sqrt(stdDevs[0] / pixels);
        stdDevs[1] = Math.sqrt(stdDevs[1] / pixels);
        stdDevs[2] = Math.sqrt(stdDevs[2] / pixels);

        // Apply decorrelation
        for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                const normalized = (data[i + c] - means[c]) / stdDevs[c];
                const stretched = normalized * amount + data[i + c] * (1 - amount);
                data[i + c] = Math.max(0, Math.min(255, stretched));
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

            // Shadows (lift shadows)
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

        // Apply sharpening if needed
        if (sharpness > 0) {
            return this.applyUnsharpMask(imageData, sharpness / 100);
        }

        return imageData;
    }

    async applyAdvancedEnhancements(imageData, params) {
        const { normalMap, lightAngle, lightIntensity, edgeStrength, edgeThickness, directionalSharpen } = params;

        // Generate normal map if needed
        let normalData = null;
        if (normalMap > 0) {
            normalData = this.generateNormalMap(imageData);
            imageData = this.applyNormalMapLighting(imageData, normalData, lightAngle, lightIntensity / 100, normalMap / 100);
        }

        // Apply edge detection
        if (edgeStrength > 0) {
            const edges = this.detectEdges(imageData, edgeStrength / 100);
            if (edgeThickness > 1) {
                this.dilateEdges(edges, edgeThickness);
            }
            imageData = this.blendEdges(imageData, edges);
        }

        // Apply directional sharpening
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

        // Calculate luminance and gradients
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Get surrounding luminance values
                const tl = this.getLuminance(data, (y - 1) * width + (x - 1), 4);
                const tc = this.getLuminance(data, (y - 1) * width + x, 4);
                const tr = this.getLuminance(data, (y - 1) * width + (x + 1), 4);
                const ml = this.getLuminance(data, y * width + (x - 1), 4);
                const mr = this.getLuminance(data, y * width + (x + 1), 4);
                const bl = this.getLuminance(data, (y + 1) * width + (x - 1), 4);
                const bc = this.getLuminance(data, (y + 1) * width + x, 4);
                const br = this.getLuminance(data, (y + 1) * width + (x + 1), 4);

                // Sobel operator
                const dx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
                const dy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);

                // Calculate normal
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

        // Convert angle to radians and create light direction
        const angleRad = (angle * Math.PI) / 180;
        const lightDir = [Math.cos(angleRad), Math.sin(angleRad), 0.5];
        const lightMag = Math.sqrt(lightDir[0] * lightDir[0] + lightDir[1] * lightDir[1] + lightDir[2] * lightDir[2]);
        lightDir[0] /= lightMag;
        lightDir[1] /= lightMag;
        lightDir[2] /= lightMag;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const nIdx = (y * width + x) * 3;

                // Get normal
                const nx = normalData[nIdx];
                const ny = normalData[nIdx + 1];
                const nz = normalData[nIdx + 2];

                // Calculate dot product (lighting)
                const dotProduct = nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2];
                const lighting = Math.max(0, dotProduct) * intensity;

                // Apply lighting
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
        const data = imageData.data;
        const edges = new Uint8Array(width * height);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;

                // Sobel operators
                const gx = (
                    -1 * this.getLuminance(data, (y - 1) * width + (x - 1), 4) +
                    1 * this.getLuminance(data, (y - 1) * width + (x + 1), 4) +
                    -2 * this.getLuminance(data, y * width + (x - 1), 4) +
                    2 * this.getLuminance(data, y * width + (x + 1), 4) +
                    -1 * this.getLuminance(data, (y + 1) * width + (x - 1), 4) +
                    1 * this.getLuminance(data, (y + 1) * width + (x + 1), 4)
                );

                const gy = (
                    -1 * this.getLuminance(data, (y - 1) * width + (x - 1), 4) +
                    -2 * this.getLuminance(data, (y - 1) * width + x, 4) +
                    -1 * this.getLuminance(data, (y - 1) * width + (x + 1), 4) +
                    1 * this.getLuminance(data, (y + 1) * width + (x - 1), 4) +
                    2 * this.getLuminance(data, (y + 1) * width + x, 4) +
                    1 * this.getLuminance(data, (y + 1) * width + (x + 1), 4)
                );

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = magnitude > threshold * 255 ? 255 : 0;
            }
        }

        return edges;
    }

    dilateEdges(edges, thickness) {
        const width = Math.sqrt(edges.length);
        const height = width;
        const temp = new Uint8Array(edges);

        for (let i = 0; i < thickness - 1; i++) {
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

        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const edgeIdx = y * width + x;
