document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const imageDisplay = document.getElementById('imageDisplay');
    const imageLoader = document.getElementById('imageLoader');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Header buttons
    const cancelBtn = document.getElementById('cancel-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const menuBtn = document.getElementById('menu-btn');
    const downloadBtn = document.getElementById('download-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const newImageBtn = document.getElementById('new-image-btn');
    
    // All Sliders
    const allSliders = document.querySelectorAll('input[type="range"]');
    const stretchSlider = document.getElementById('stretch');
    
    // Navigation
    const navTabs = document.querySelectorAll('.nav-tab');
    const controlPanels = document.querySelectorAll('.control-panel');
    const colorspaceButtons = document.querySelectorAll('.cs-btn');
    const resetPanelBtns = document.querySelectorAll('.reset-panel-btn');
    
    // Overlays
    const comparisonIndicator = document.querySelector('.comparison-indicator');
    const processingOverlay = document.querySelector('.processing-overlay');
    const menuModal = document.getElementById('menu-modal');
    const closeMenuBtn = document.getElementById('close-menu');
    
    // AI Tools
    const superResBtn = document.getElementById('super-res-btn');
    const autoEnhanceBtn = document.getElementById('auto-enhance-btn');
    
    // Video elements
    const videoElement = document.getElementById('videoElement');
    const videoCanvas = document.getElementById('videoCanvas');
    const videoCtx = videoCanvas.getContext('2d');
    const startVideoBtn = document.getElementById('start-video-btn');
    const captureFrameBtn = document.getElementById('capture-frame-btn');
    const liveEnhanceToggle = document.getElementById('live-enhance-toggle');
    const videoStretchSlider = document.getElementById('video-stretch');
    
    // === STATE MANAGEMENT ===
    let originalImageSrc = null;
    let history = [];
    let historyIndex = -1;
    let selectedColorspace = 'RGB';
    let isProcessing = false;
    let processingQueue = null;
    let worker = null;
    let videoStream = null;
    let videoAnimationFrame = null;
    
    // === WEB WORKER INITIALIZATION ===
    function initWorker() {
        if (typeof Worker !== 'undefined') {
            try {
                worker = new Worker('worker.js');
                worker.onmessage = handleWorkerMessage;
                worker.onerror = (error) => {
                    console.error('Worker error:', error);
                    isProcessing = false;
                    hideProcessing();
                };
            } catch (e) {
                console.warn('Web Worker not available, using main thread');
            }
        }
    }
    
    function handleWorkerMessage(e) {
        const { type, data } = e.data;
        
        if (type === 'DSTRETCH_COMPLETE') {
            applyProcessedData(data);
        } else if (type === 'DSTRETCH_ERROR') {
            console.error('DStretch error:', data);
            isProcessing = false;
            hideProcessing();
        }
    }
    
    // === DEBOUNCE UTILITY ===
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };
    
    // === HISTORY (UNDO/REDO) MANAGEMENT ===
    const updateHistory = (dataUrl) => {
        if (history[historyIndex] === dataUrl) return;
        history.splice(historyIndex + 1);
        history.push(dataUrl);
        historyIndex++;
        updateUndoRedoButtons();
    };
    
    const updateUndoRedoButtons = () => {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex === history.length - 1;
    };
    
    const undo = () => {
        if (historyIndex > 0) {
            historyIndex--;
            imageDisplay.src = history[historyIndex];
            updateUndoRedoButtons();
        }
    };
    
    const redo = () => {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            imageDisplay.src = history[historyIndex];
            updateUndoRedoButtons();
        }
    };
    
    // === UI HELPERS ===
    function showProcessing() {
        processingOverlay.classList.add('visible');
    }
    
    function hideProcessing() {
        processingOverlay.classList.remove('visible');
    }
    
    function updateSliderValue(slider) {
        const valueDisplay = document.getElementById(`${slider.id}-value`);
        if (valueDisplay) {
            valueDisplay.textContent = slider.value;
        }
    }
    
    // === INITIALIZATION ===
    const initialize = () => {
        initWorker();
        
        // Navigation tabs
        navTabs.forEach(tab => tab.addEventListener('click', () => {
            navTabs.forEach(t => t.classList.remove('active'));
            controlPanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.panel).classList.add('active');
        }));
        
        // Image upload
        imageDisplay.addEventListener('click', () => { 
            if (!originalImageSrc) imageLoader.click(); 
        });
        imageLoader.addEventListener('change', handleImageUpload);
        
        // Colorspace selection
        colorspaceButtons.forEach(button => button.addEventListener('click', () => {
            colorspaceButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedColorspace = button.dataset.colorspace;
            if (originalImageSrc) debouncedProcess(true);
        }));
        
        // Slider updates
        const debouncedProcess = debounce((isNewState) => {
            if (originalImageSrc) processImage(isNewState);
        }, 150);
        
        allSliders.forEach(slider => {
            updateSliderValue(slider);
            slider.addEventListener('input', () => {
                updateSliderValue(slider);
                if (originalImageSrc && slider.id !== 'video-stretch') {
                    debouncedProcess(slider.id === 'stretch');
                }
            });
        });
        
        // Comparison (tap and hold)
        let isComparing = false;
        imageDisplay.addEventListener('pointerdown', (e) => {
            if (originalImageSrc && history.length > 0) {
                isComparing = true;
                imageDisplay.classList.add('comparing');
                imageDisplay.src = originalImageSrc;
                comparisonIndicator.classList.add('visible');
            }
        });
        
        const endComparison = () => {
            if (isComparing) {
                isComparing = false;
                imageDisplay.classList.remove('comparing');
                if (originalImageSrc && history.length > 0) {
                    imageDisplay.src = history[historyIndex];
                }
                comparisonIndicator.classList.remove('visible');
            }
        };
        
        imageDisplay.addEventListener('pointerup', endComparison);
        imageDisplay.addEventListener('pointerleave', endComparison);
        imageDisplay.addEventListener('pointercancel', endComparison);
        
        // Header buttons
        cancelBtn.addEventListener('click', resetToOriginal);
        downloadBtn.addEventListener('click', downloadImage);
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);
        menuBtn.addEventListener('click', () => menuModal.classList.add('visible'));
        closeMenuBtn.addEventListener('click', () => menuModal.classList.remove('visible'));
        resetAllBtn.addEventListener('click', resetAll);
        newImageBtn.addEventListener('click', () => {
            imageLoader.click();
            menuModal.classList.remove('visible');
        });
        
        // Reset panel buttons
        resetPanelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.dataset.panel;
                if (panel === 'colorspace') {
                    stretchSlider.value = 50;
                    updateSliderValue(stretchSlider);
                } else if (panel === 'adjust') {
                    document.querySelectorAll('#adjust-panel input[type="range"]').forEach(slider => {
                        slider.value = 0;
                        updateSliderValue(slider);
                    });
                }
                if (originalImageSrc) processImage(true);
            });
        });
        
        // AI Tools
        superResBtn.addEventListener('click', () => {
            alert('Super Resolution coming soon! This feature will use AI to enhance image quality and increase resolution.');
        });
        
        autoEnhanceBtn.addEventListener('click', autoEnhance);
        
        // Video controls
        startVideoBtn.addEventListener('click', toggleVideo);
        captureFrameBtn.addEventListener('click', captureVideoFrame);
        liveEnhanceToggle.addEventListener('change', handleLiveEnhanceToggle);
        videoStretchSlider.addEventListener('input', () => {
            updateSliderValue(videoStretchSlider);
        });
        
        // Close modal on background click
        menuModal.addEventListener('click', (e) => {
            if (e.target === menuModal) {
                menuModal.classList.remove('visible');
            }
        });
    };
    
    // === IMAGE UPLOAD ===
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = e => {
            originalImageSrc = e.target.result;
            history = [originalImageSrc];
            historyIndex = 0;
            updateUndoRedoButtons();
            resetAndProcess();
        };
        reader.readAsDataURL(file);
    }
    
    function resetAndProcess() {
        allSliders.forEach(slider => {
            if (slider.id === 'stretch') {
                slider.value = 50;
            } else if (slider.id !== 'video-stretch') {
                slider.value = 0;
            }
            updateSliderValue(slider);
        });
        processImage(true);
    }
    
    function resetToOriginal() {
        if (originalImageSrc) {
            imageDisplay.src = originalImageSrc;
            history = [originalImageSrc];
            historyIndex = 0;
            updateUndoRedoButtons();
            resetAndProcess();
        }
    }
    
    function resetAll() {
        resetToOriginal();
        menuModal.classList.remove('visible');
    }
    
    // === MAIN IMAGE PROCESSING PIPELINE ===
    function processImage(isNewHistoryState = true) {
        if (!originalImageSrc) return;
        
        // Queue processing if already processing
        if (isProcessing) {
            processingQueue = { isNewHistoryState };
            return;
        }
        
        isProcessing = true;
        showProcessing();
        
        // Use requestAnimationFrame for smooth UI
        requestAnimationFrame(() => {
            const baseImage = new Image();
            baseImage.onload = () => {
                canvas.width = baseImage.naturalWidth;
                canvas.height = baseImage.naturalHeight;
                ctx.drawImage(baseImage, 0, 0);
                
                let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let pixels = imageData.data;
                
                // Step 1: Apply adjustments on main thread (fast)
                applyAdjustments(pixels);
                
                // Step 2: Run DStretch (potentially slow, use worker if available)
                const stretchAmount = parseFloat(stretchSlider.value);
                
                if (worker) {
                    // Offload to worker
                    worker.postMessage({
                        type: 'PROCESS_DSTRETCH',
                        data: {
                            imageData: pixels,
                            colorspace: selectedColorspace,
                            stretchAmount: stretchAmount
                        }
                    });
                } else {
                    // Fallback to main thread
                    const finalPixelData = runDStretchMainThread(pixels, stretchAmount);
                    applyProcessedData(finalPixelData);
                }
            };
            baseImage.src = originalImageSrc;
        });
    }
    
    function applyProcessedData(finalPixelData) {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        imageData.data.set(finalPixelData);
        ctx.putImageData(imageData, 0, 0);
        
        const finalDataUrl = canvas.toDataURL('image/png', 0.95);
        imageDisplay.src = finalDataUrl;
        
        const queuedRequest = processingQueue;
        processingQueue = null;
        
        if (queuedRequest) {
            updateHistory(finalDataUrl);
            isProcessing = false;
            hideProcessing();
            processImage(queuedRequest.isNewHistoryState);
        } else {
            if (queuedRequest === null) {
                updateHistory(finalDataUrl);
            } else {
                history[historyIndex] = finalDataUrl;
            }
            isProcessing = false;
            hideProcessing();
        }
    }
    
    function applyAdjustments(pixels) {
        const exposure = parseFloat(document.getElementById('exposure').value);
        const shadows = parseFloat(document.getElementById('shadows').value);
        const brightness = parseFloat(document.getElementById('brightness').value);
        const contrast = parseFloat(document.getElementById('contrast').value);
        const blackPoint = parseFloat(document.getElementById('blackPoint').value) / 100;
        const saturation = parseFloat(document.getElementById('saturation').value);
        const sharpen = parseFloat(document.getElementById('sharpen').value);
        
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const satFactor = saturation / 100;
        
        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            
            // Exposure & Brightness
            const totalBrightness = exposure + brightness;
            r += totalBrightness;
            g += totalBrightness;
            b += totalBrightness;
            
            // Shadows lift
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            if (luma < 128) {
                const shadowFactor = shadows * (1 - luma / 128) * 0.5;
                r += shadowFactor;
                g += shadowFactor;
                b += shadowFactor;
            }
            
            // Contrast
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;
            
            // Black Point
            r = Math.max(r, r * blackPoint);
            g = Math.max(g, g * blackPoint);
            b = Math.max(b, b * blackPoint);
            
            // Saturation
            const avg = (r + g + b) / 3;
            r = avg + (r - avg) * (1 + satFactor);
            g = avg + (g - avg) * (1 + satFactor);
            b = avg + (b - avg) * (1 + satFactor);
            
            // Clamp
            pixels[i] = Math.max(0, Math.min(255, r));
            pixels[i + 1] = Math.max(0, Math.min(255, g));
            pixels[i + 2] = Math.max(0, Math.min(255, b));
        }
        
        // Simple sharpen filter
        if (sharpen > 0) {
            applySharpen(pixels, canvas.width, canvas.height, sharpen / 100);
        }
    }
    
    function applySharpen(pixels, width, height, amount) {
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        const side = Math.round(Math.sqrt(kernel.length));
        const halfSide = Math.floor(side / 2);
        const output = new Uint8ClampedArray(pixels.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dstOff = (y * width + x) * 4;
                let r = 0, g = 0, b = 0;
                
                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
                        const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
                        const srcOff = (scy * width + scx) * 4;
                        const wt = kernel[cy * side + cx];
                        
                        r += pixels[srcOff] * wt;
                        g += pixels[srcOff + 1] * wt;
                        b += pixels[srcOff + 2] * wt;
                    }
                }
                
                output[dstOff] = pixels[dstOff] + (r - pixels[dstOff]) * amount;
                output[dstOff + 1] = pixels[dstOff + 1] + (g - pixels[dstOff + 1]) * amount;
                output[dstOff + 2] = pixels[dstOff + 2] + (b - pixels[dstOff + 2]) * amount;
                output[dstOff + 3] = pixels[dstOff + 3];
            }
        }
        
        pixels.set(output);
    }
    
    function runDStretchMainThread(imageData, stretchAmount) {
        const nPixels = imageData.length / 4;
        let c1 = [], c2 = [], c3 = [];
        
        for (let i = 0; i < nPixels; i++) {
            const r = imageData[i * 4];
            const g = imageData[i * 4 + 1];
            const b = imageData[i * 4 + 2];
            const converted = convertRgbTo(r, g, b, selectedColorspace);
            c1.push(converted[0]);
            c2.push(converted[1]);
            c3.push(converted[2]);
        }
        
        const { stretchedC1, stretchedC2, stretchedC3 } = performDstretch(c1, c2, c3, stretchAmount);
        
        const finalPixelData = new Uint8ClampedArray(imageData.length);
        for (let i = 0; i < nPixels; i++) {
            const rgb = convertToRgb(stretchedC1[i], stretchedC2[i], stretchedC3[i], selectedColorspace);
            const pixelIndex = i * 4;
            finalPixelData[pixelIndex] = rgb[0];
            finalPixelData[pixelIndex + 1] = rgb[1];
            finalPixelData[pixelIndex + 2] = rgb[2];
            finalPixelData[pixelIndex + 3] = 255;
        }
        
        return finalPixelData;
    }
    
    // === AUTO ENHANCE (AI-POWERED) ===
    function autoEnhance() {
        if (!originalImageSrc) {
            alert('Please load an image first');
            return;
        }
        
        showProcessing();
        
        // Simulate AI analysis with smart defaults
        setTimeout(() => {
            // Reset to original first
            const baseImage = new Image();
            baseImage.onload = () => {
                canvas.width = baseImage.naturalWidth;
                canvas.height = baseImage.naturalHeight;
                ctx.drawImage(baseImage, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const analysis = analyzeImage(imageData);
                
                // Apply smart adjustments based on analysis
                document.getElementById('exposure').value = analysis.exposure;
                document.getElementById('shadows').value = analysis.shadows;
                document.getElementById('brightness').value = analysis.brightness;
                document.getElementById('contrast').value = analysis.contrast;
                document.getElementById('saturation').value = analysis.saturation;
                stretchSlider.value = analysis.stretch;
                
                // Update displays
                allSliders.forEach(updateSliderValue);
                
                // Process with new settings
                hideProcessing();
                processImage(true);
            };
            baseImage.src = originalImageSrc;
        }, 500);
    }
    
    function analyzeImage(imageData) {
        const pixels = imageData.data;
        let totalBrightness = 0;
        let darkPixels = 0;
        let brightPixels = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const luma = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            totalBrightness += luma;
            if (luma < 85) darkPixels++;
            if (luma > 170) brightPixels++;
        }
        
        const avgBrightness = totalBrightness / (pixels.length / 4);
        const darkRatio = darkPixels / (pixels.length / 4);
        const brightRatio = brightPixels / (pixels.length / 4);
        
        // Smart adjustments based on analysis
        const exposure = avgBrightness < 100 ? 15 : (avgBrightness > 155 ? -10 : 0);
        const shadows = darkRatio > 0.3 ? 30 : 15;
        const brightness = avgBrightness < 110 ? 10 : 0;
        const contrast = avgBrightness > 100 && avgBrightness < 155 ? 15 : 10;
        const saturation = 20;
        const stretch = 65;
        
        return { exposure, shadows, brightness, contrast, saturation, stretch };
    }
    
    // === VIDEO PROCESSING ===
    async function toggleVideo() {
        if (!videoStream) {
            try {
                // Simplified constraints for better compatibility
                const constraints = {
                    video: {
                        facingMode: 'environment'
                    }
                };
                
                videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                videoElement.srcObject = videoStream;
                videoElement.classList.add('active');
                imageDisplay.classList.add('hidden');
                
                // Update button text
                const btnText = startVideoBtn.querySelector('span');
                if (btnText) btnText.textContent = 'Stop Camera';
                
                captureFrameBtn.disabled = false;
                
                // Wait for video to be ready
                videoElement.onloadedmetadata = () => {
                    if (liveEnhanceToggle.checked) {
                        startLiveProcessing();
                    }
                };
            } catch (err) {
                console.error('Camera error:', err);
                alert('Could not access camera. Please make sure:\n1. You granted camera permission\n2. Your browser supports camera access\n3. The site is using HTTPS');
            }
        } else {
            stopVideo();
        }
    }
    
    function stopVideo() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
            videoElement.classList.remove('active');
            videoCanvas.classList.remove('active');
            videoElement.srcObject = null;
            imageDisplay.classList.remove('hidden');
            
            // Update button text
            const btnText = startVideoBtn.querySelector('span');
            if (btnText) btnText.textContent = 'Start Camera';
            
            captureFrameBtn.disabled = true;
            stopLiveProcessing();
        }
    }
    
    function handleLiveEnhanceToggle() {
        if (liveEnhanceToggle.checked && videoStream) {
            startLiveProcessing();
        } else {
            stopLiveProcessing();
        }
    }
    
    function startLiveProcessing() {
        if (videoAnimationFrame) return;
        
        const processFrame = () => {
            if (!liveEnhanceToggle.checked || !videoStream) {
                stopLiveProcessing();
                return;
            }
            
            // Make sure video is ready
            if (videoElement.readyState < 2) {
                videoAnimationFrame = requestAnimationFrame(processFrame);
                return;
            }
            
            try {
                videoCanvas.width = videoElement.videoWidth;
                videoCanvas.height = videoElement.videoHeight;
                
                if (videoCanvas.width > 0 && videoCanvas.height > 0) {
                    videoCtx.drawImage(videoElement, 0, 0);
                    
                    const imageData = videoCtx.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
                    const pixels = imageData.data;
                    
                    // Apply quick enhancement
                    const stretchAmount = parseFloat(videoStretchSlider.value);
                    applyQuickEnhancement(pixels, stretchAmount);
                    
                    videoCtx.putImageData(imageData, 0, 0);
                    videoElement.style.display = 'none';
                    videoCanvas.style.display = 'block';
                    videoCanvas.style.width = '100%';
                    videoCanvas.style.maxHeight = '150px';
                    videoCanvas.style.objectFit = 'cover';
                    videoCanvas.style.borderRadius = '12px';
                    videoCanvas.style.marginTop = '12px';
                }
            } catch (err) {
                console.error('Frame processing error:', err);
            }
            
            videoAnimationFrame = requestAnimationFrame(processFrame);
        };
        
        processFrame();
    }
    
    function stopLiveProcessing() {
        if (videoAnimationFrame) {
            cancelAnimationFrame(videoAnimationFrame);
            videoAnimationFrame = null;
            videoCanvas.style.display = 'none';
            videoElement.style.display = 'block';
        }
    }
    
    function applyQuickEnhancement(pixels, stretch) {
        // Lightweight enhancement for real-time processing
        const enhanceFactor = stretch / 50;
        
        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            
            // Simple color stretch
            const avg = (r + g + b) / 3;
            r = avg + (r - avg) * enhanceFactor;
            g = avg + (g - avg) * enhanceFactor;
            b = avg + (b - avg) * enhanceFactor;
            
            pixels[i] = Math.max(0, Math.min(255, r));
            pixels[i + 1] = Math.max(0, Math.min(255, g));
            pixels[i + 2] = Math.max(0, Math.min(255, b));
        }
    }
    
    function captureVideoFrame() {
        if (!videoStream) return;
        
        try {
            // Make sure video is ready
            if (videoElement.readyState < 2) {
                alert('Video not ready yet. Please wait a moment.');
                return;
            }
            
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = videoElement.videoWidth;
            captureCanvas.height = videoElement.videoHeight;
            
            if (captureCanvas.width === 0 || captureCanvas.height === 0) {
                alert('Could not capture frame. Please try again.');
                return;
            }
            
            const captureCtx = captureCanvas.getContext('2d');
            captureCtx.drawImage(videoElement, 0, 0);
            
            originalImageSrc = captureCanvas.toDataURL('image/png');
            history = [originalImageSrc];
            historyIndex = 0;
            updateUndoRedoButtons();
            
            // Switch to enhance tab
            navTabs[0].click();
            
            // Stop video
            stopVideo();
            
            // Process captured frame
            processImage(true);
        } catch (err) {
            console.error('Capture error:', err);
            alert('Could not capture frame: ' + err.message);
        }
    }
    
    function downloadImage() {
        if (!history[historyIndex]) {
            alert('No image to download');
            return;
        }
        const link = document.createElement('a');
        link.download = `DStretchAIPro_${Date.now()}.png`;
        link.href = history[historyIndex];
        link.click();
        menuModal.classList.remove('visible');
    }
    
    // === UTILITY FUNCTIONS (Fallback for main thread) ===
    function calculateMean(arr) {
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }
    
    function calculateCovarianceMatrix(c1, c2, c3, m1, m2, m3) {
        const n = c1.length;
        let cov11 = 0, cov22 = 0, cov33 = 0;
        let cov12 = 0, cov13 = 0, cov23 = 0;
        
        for (let i = 0; i < n; i++) {
            const d1 = c1[i] - m1;
            const d2 = c2[i] - m2;
            const d3 = c3[i] - m3;
            cov11 += d1 * d1;
            cov22 += d2 * d2;
            cov33 += d3 * d3;
            cov12 += d1 * d2;
            cov13 += d1 * d3;
            cov23 += d2 * d3;
        }
        
        const divisor = n - 1;
        return [
            [cov11 / divisor, cov12 / divisor, cov13 / divisor],
            [cov12 / divisor, cov22 / divisor, cov23 / divisor],
            [cov13 / divisor, cov23 / divisor, cov33 / divisor]
        ];
    }
    
    function eigenDecomposition(matrix) {
        try {
            const { vectors, values } = math.eigs(matrix);
            return { eigenvectors: vectors, eigenvalues: values };
        } catch (e) {
            return {
                eigenvectors: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
                eigenvalues: [1, 1, 1]
            };
        }
    }
    
    function performDstretch(c1, c2, c3, stretchAmount) {
        const meanC1 = calculateMean(c1);
        const meanC2 = calculateMean(c2);
        const meanC3 = calculateMean(c3);
        const covMatrix = calculateCovarianceMatrix(c1, c2, c3, meanC1, meanC2, meanC3);
        const { eigenvectors, eigenvalues } = eigenDecomposition(covMatrix);
        
        let stretchedC1 = [], stretchedC2 = [], stretchedC3 = [];
        
        for (let i = 0; i < c1.length; i++) {
            const v1 = c1[i] - meanC1, v2 = c2[i] - meanC2, v3 = c3[i] - meanC3;
            let p1 = v1 * eigenvectors[0][0] + v2 * eigenvectors[1][0] + v3 * eigenvectors[2][0];
            let p2 = v1 * eigenvectors[0][1] + v2 * eigenvectors[1][1] + v3 * eigenvectors[2][1];
            let p3 = v1 * eigenvectors[0][2] + v2 * eigenvectors[1][2] + v3 * eigenvectors[2][2];
            p1 *= (stretchAmount / Math.sqrt(Math.abs(eigenvalues[0]) || 1));
            p2 *= (stretchAmount / Math.sqrt(Math.abs(eigenvalues[1]) || 1));
            p3 *= (stretchAmount / Math.sqrt(Math.abs(eigenvalues[2]) || 1));
            stretchedC1[i] = p1 * eigenvectors[0][0] + p2 * eigenvectors[0][1] + p3 * eigenvectors[0][2] + meanC1;
            stretchedC2[i] = p1 * eigenvectors[1][0] + p2 * eigenvectors[1][1] + p3 * eigenvectors[1][2] + meanC2;
            stretchedC3[i] = p1 * eigenvectors[2][0] + p2 * eigenvectors[2][1] + p3 * eigenvectors[2][2] + meanC3;
        }
        return { stretchedC1, stretchedC2, stretchedC3 };
    }
    
    function convertRgbTo(r, g, b, cs) {
        switch (cs) {
            case 'LAB': return rgbToLab(r, g, b);
            case 'YRE': return [0.299 * r + 0.587 * g + 0.114 * b, r, g];
            case 'LRE': return [0.2126 * r + 0.7152 * g + 0.0722 * b, r, g];
            case 'YBK': return [0.299 * r + 0.587 * g + 0.114 * b, b, 255 - g];
            default: return [r, g, b];
        }
    }
    
    function convertToRgb(c1, c2, c3, cs) {
        let rgb;
        switch (cs) {
            case 'LAB': rgb = labToRgb(c1, c2, c3); break;
            case 'YRE': rgb = [c2, c3, (c1 - 0.587 * c3 - 0.299 * c2) / 0.114]; break;
            case 'LRE': rgb = [c2, c3, (c1 - 0.7152 * c3 - 0.2126 * c2) / 0.0722]; break;
            case 'YBK': rgb = [(c1 - 0.587 * (255 - c3) - 0.114 * c2) / 0.299, 255 - c3, c2]; break;
            default: rgb = [c1, c2, c3];
        }
        return [
            Math.max(0, Math.min(255, rgb[0])),
            Math.max(0, Math.min(255, rgb[1])),
            Math.max(0, Math.min(255, rgb[2]))
        ];
    }
    
    function rgbToLab(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
        let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
        let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;
        x /= 95.047; y /= 100; z /= 108.883;
        x = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
        y = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
        z = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;
        return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
    }
    
    function labToRgb(l, a, b_lab) {
        let y = (l + 16) / 116, x = a / 500 + y, z = y - b_lab / 200;
        const x3 = x * x * x, y3 = y * y * y, z3 = z * z * z;
        x = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
        y = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
        z = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;
        x *= 95.047; y *= 100; z *= 108.883;
        x /= 100; y /= 100; z /= 100;
        let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
        let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
        let b = x * 0.0557 + y * -0.2040 + z * 1.0570;
        r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
        g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
        b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;
        return [r * 255, g * 255, b * 255];
    }
    
    initialize();
});
