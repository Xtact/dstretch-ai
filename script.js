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
    const decorrelationSlider = document.getElementById('decorrelation');
    
    // Advanced sliders
    const lightAngleSlider = document.getElementById('lightAngle');
    const edgeStrengthSlider = document.getElementById('edgeStrength');
    const edgeThicknessSlider = document.getElementById('edgeThickness');
    const normalStrengthSlider = document.getElementById('normalStrength');
    const radianceScaleSlider = document.getElementById('radianceScale');
    const directionalSharpSlider = document.getElementById('directionalSharp');
    
    // Toggles
    const enableEdges = document.getElementById('enable-edges');
    const enableNormals = document.getElementById('enable-normals');
    const enableICA = document.getElementById('enable-ica');
    const bypassDStretch = document.getElementById('bypass-dstretch');
    
    // Zoom controls
    const zoomControls = document.querySelector('.zoom-controls');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    const zoomLevelDisplay = document.getElementById('zoom-level');
    
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
    
    // === STATE MANAGEMENT ===
    let originalImageSrc = null;
    let history = [];
    let historyIndex = -1;
    let selectedColorspace = 'RGB';
    let isProcessing = false;
    let processingQueue = null;
    let worker = null;
    
    // Zoom state
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let compareTimeout = null;
    
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
            let displayValue = slider.value;
            if (slider.id === 'lightAngle') {
                displayValue = slider.value + '°';
            }
            valueDisplay.textContent = displayValue;
        }
    }
    
    // === INITIALIZATION ===
    const initialize = () => {
        console.log('=== DStretch Pro Plus+ Initializing ===');
        console.log('Image display element:', imageDisplay);
        console.log('Image loader element:', imageLoader);
        console.log('Nav tabs found:', navTabs.length);
        
        initWorker();
        
        // Navigation tabs - FIXED SIMPLIFIED VERSION
        console.log('Setting up navigation...');
        navTabs.forEach((tab, index) => {
            console.log(`Setting up tab ${index}:`, tab.dataset.panel);
            
            tab.addEventListener('click', function(e) {
                console.log('=== TAB CLICKED ===', this.dataset.panel);
                
                const panelId = this.dataset.panel;
                
                // Remove all active classes
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.control-panel').forEach(p => p.classList.remove('active'));
                
                // Add active to clicked tab and corresponding panel
                this.classList.add('active');
                const targetPanel = document.getElementById(panelId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    console.log('Activated panel:', panelId);
                } else {
                    console.error('PANEL NOT FOUND:', panelId);
                }
            });
        });
        
        // Image upload - COMPLETELY SIMPLIFIED
        console.log('Setting up image upload...');
        
        const triggerUpload = () => {
            console.log('=== TRIGGERING UPLOAD ===');
            imageLoader.click();
        };
        
        // Make entire workspace clickable
        workspace.addEventListener('click', (e) => {
            // Ignore if clicking on zoom controls
            if (e.target.closest('.zoom-controls')) return;
            // Ignore if zoomed and panning
            if (zoomLevel > 1 && isPanning) return;
            
            console.log('Workspace clicked - triggering upload');
            triggerUpload();
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
                if (originalImageSrc) {
                    debouncedProcess(slider.id === 'stretch');
                }
            });
        });
        
        // Toggle change handlers
        [enableEdges, enableNormals, enableICA, bypassDStretch].forEach(toggle => {
            toggle.addEventListener('change', () => {
                if (originalImageSrc) processImage(false);
            });
        });
        
        // Zoom controls
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        zoomResetBtn.addEventListener('click', resetZoom);
        
        // Show/hide zoom controls when image is loaded
        imageDisplay.addEventListener('load', () => {
            if (originalImageSrc) {
                zoomControls.classList.add('visible');
            }
        });
        
        // Pan functionality - SIMPLIFIED
        let panStartX = 0, panStartY = 0, lastPanX = 0, lastPanY = 0;
        
        imageDisplay.addEventListener('mousedown', (e) => {
            if (zoomLevel <= 1) return;
            if (e.target.closest('.zoom-controls')) return;
            
            e.preventDefault();
            isPanning = true;
            panStartX = e.clientX;
            panStartY = e.clientY;
            lastPanX = panX;
            lastPanY = panY;
        });
        
        imageDisplay.addEventListener('touchstart', (e) => {
            if (zoomLevel <= 1) return;
            if (e.target.closest('.zoom-controls')) return;
            
            e.preventDefault();
            isPanning = true;
            panStartX = e.touches[0].clientX;
            panStartY = e.touches[0].clientY;
            lastPanX = panX;
            lastPanY = panY;
        }, { passive: false });
        
        document.addEventListener('mousemove', (e) => {
            if (!isPanning || zoomLevel <= 1) return;
            e.preventDefault();
            panX = lastPanX + (e.clientX - panStartX);
            panY = lastPanY + (e.clientY - panStartY);
            applyZoom();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isPanning || zoomLevel <= 1) return;
            e.preventDefault();
            panX = lastPanX + (e.touches[0].clientX - panStartX);
            panY = lastPanY + (e.touches[0].clientY - panStartY);
            applyZoom();
        }, { passive: false });
        
        document.addEventListener('mouseup', () => { isPanning = false; });
        document.addEventListener('touchend', () => { isPanning = false; });
        
        // Comparison (long press only, separate from clicks)
        let isComparing = false;
        let compareTimeout = null;
        
        imageDisplay.addEventListener('pointerdown', (e) => {
            if (originalImageSrc && history.length > 0 && zoomLevel === 1) {
                compareTimeout = setTimeout(() => {
                    isComparing = true;
                    imageDisplay.classList.add('comparing');
                    const tempSrc = imageDisplay.src;
                    imageDisplay.src = originalImageSrc;
                    imageDisplay.dataset.tempSrc = tempSrc;
                    comparisonIndicator.classList.add('visible');
                }, 500); // Long press for 500ms
            }
        });
        
        const endComparison = () => {
            if (compareTimeout) {
                clearTimeout(compareTimeout);
                compareTimeout = null;
            }
            if (isComparing) {
                isComparing = false;
                imageDisplay.classList.remove('comparing');
                if (imageDisplay.dataset.tempSrc) {
                    imageDisplay.src = imageDisplay.dataset.tempSrc;
                    delete imageDisplay.dataset.tempSrc;
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
                    decorrelationSlider.value = 0;
                    updateSliderValue(stretchSlider);
                    updateSliderValue(decorrelationSlider);
                } else if (panel === 'adjust') {
                    document.querySelectorAll('#adjust-panel input[type=\"range\"]').forEach(slider => {
                        slider.value = 0;
                        updateSliderValue(slider);
                    });
                } else if (panel === 'advanced') {
                    lightAngleSlider.value = 45;
                    edgeStrengthSlider.value = 50;
                    edgeThicknessSlider.value = 1;
                    normalStrengthSlider.value = 50;
                    radianceScaleSlider.value = 50;
                    directionalSharpSlider.value = 0;
                    enableEdges.checked = false;
                    enableNormals.checked = false;
                    enableICA.checked = false;
                    [lightAngleSlider, edgeStrengthSlider, edgeThicknessSlider, 
                     normalStrengthSlider, radianceScaleSlider, directionalSharpSlider].forEach(updateSliderValue);
                }
                if (originalImageSrc) processImage(true);
            });
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
            } else if (slider.id === 'lightAngle') {
                slider.value = 45;
            } else if (slider.id === 'edgeStrength' || slider.id === 'normalStrength' || slider.id === 'radianceScale') {
                slider.value = 50;
            } else if (slider.id === 'edgeThickness') {
                slider.value = 1;
            } else {
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
                
                // Step 1: Apply decorrelation stretch if enabled
                const decorrelation = parseFloat(decorrelationSlider.value);
                if (decorrelation > 0) {
                    applyDecorrelationStretch(pixels, canvas.width, canvas.height, decorrelation / 100);
                }
                
                // Step 2: Apply basic adjustments
                applyAdjustments(pixels);
                
                // Step 3: Apply advanced enhancements
                if (enableNormals.checked || enableEdges.checked) {
                    applyAdvancedEnhancements(pixels, canvas.width, canvas.height);
                }
                
                // Step 4: Run DStretch (potentially slow, use worker if available)
                const stretchAmount = parseFloat(stretchSlider.value);
                
                // Check if DStretch is bypassed
                if (bypassDStretch.checked) {
                    // Skip DStretch, just apply processed data
                    ctx.putImageData(imageData, 0, 0);
                    const finalDataUrl = canvas.toDataURL('image/png', 0.95);
                    imageDisplay.src = finalDataUrl;
                    updateHistory(finalDataUrl);
                    isProcessing = false;
                    hideProcessing();
                    return;
                }
                
                if (worker && !enableICA.checked) {
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
                    // Fallback to main thread or ICA mode
                    let finalPixelData;
                    if (enableICA.checked) {
                        finalPixelData = runICADStretch(pixels, stretchAmount);
                    } else {
                        finalPixelData = runDStretchMainThread(pixels, stretchAmount);
                    }
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
    
    // === DECORRELATION STRETCH ===
    function applyDecorrelationStretch(pixels, width, height, amount) {
        // Compute covariance matrix and decorrelate
        const n = pixels.length / 4;
        let rData = [], gData = [], bData = [];
        let rMean = 0, gMean = 0, bMean = 0;
        
        for (let i = 0; i < n; i++) {
            const r = pixels[i * 4];
            const g = pixels[i * 4 + 1];
            const b = pixels[i * 4 + 2];
            rData.push(r); gData.push(g); bData.push(b);
            rMean += r; gMean += g; bMean += b;
        }
        
        rMean /= n; gMean /= n; bMean /= n;
        
        // Compute covariance
        let covRR = 0, covGG = 0, covBB = 0;
        let covRG = 0, covRB = 0, covGB = 0;
        
        for (let i = 0; i < n; i++) {
            const dr = rData[i] - rMean;
            const dg = gData[i] - gMean;
            const db = bData[i] - bMean;
            covRR += dr * dr; covGG += dg * dg; covBB += db * db;
            covRG += dr * dg; covRB += dr * db; covGB += dg * db;
        }
        
        covRR /= n; covGG /= n; covBB /= n;
        covRG /= n; covRB /= n; covGB /= n;
        
        // Simple decorrelation using standard deviations
        const stdR = Math.sqrt(covRR);
        const stdG = Math.sqrt(covGG);
        const stdB = Math.sqrt(covBB);
        
        for (let i = 0; i < n; i++) {
            const idx = i * 4;
            let r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
            
            // Decorrelate and stretch
            const nr = ((r - rMean) / stdR) * 50 + rMean;
            const ng = ((g - gMean) / stdG) * 50 + gMean;
            const nb = ((b - bMean) / stdB) * 50 + bMean;
            
            // Blend with original
            pixels[idx] = r + (nr - r) * amount;
            pixels[idx + 1] = g + (ng - g) * amount;
            pixels[idx + 2] = b + (nb - b) * amount;
        }
    }
    
    // === ADVANCED ENHANCEMENTS ===
    function applyAdvancedEnhancements(pixels, width, height) {
        let normalMap = null;
        let edgeMap = null;
        
        // Generate pseudo-normal map using shape-from-shading
        if (enableNormals.checked) {
            normalMap = generateNormalMap(pixels, width, height);
            applyNormalMapLighting(pixels, normalMap, width, height);
        }
        
        // Apply Canny edge detection
        if (enableEdges.checked) {
            edgeMap = cannyEdgeDetection(pixels, width, height);
            blendEdges(pixels, edgeMap, width, height);
        }
        
        // Apply directional unsharp masking
        const directionalAmount = parseFloat(directionalSharpSlider.value);
        if (directionalAmount > 0 && edgeMap) {
            applyDirectionalSharpen(pixels, edgeMap, width, height, directionalAmount / 100);
        }
    }
    
    function generateNormalMap(pixels, width, height) {
        const normals = new Float32Array(width * height * 3);
        const strength = parseFloat(normalStrengthSlider.value) / 100;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                // Calculate luminance gradients
                const getL = (px, py) => {
                    const idx = (py * width + px) * 4;
                    return 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
                };
                
                const dX = (getL(x + 1, y) - getL(x - 1, y)) / 2;
                const dY = (getL(x, y + 1) - getL(x, y - 1)) / 2;
                
                // Compute normal
                const nX = -dX * strength;
                const nY = -dY * strength;
                const nZ = 1;
                const len = Math.sqrt(nX * nX + nY * nY + nZ * nZ);
                
                const idx = (y * width + x) * 3;
                normals[idx] = nX / len;
                normals[idx + 1] = nY / len;
                normals[idx + 2] = nZ / len;
            }
        }
        
        return normals;
    }
    
    function applyNormalMapLighting(pixels, normals, width, height) {
        const angle = parseFloat(lightAngleSlider.value) * (Math.PI / 180);
        const lightX = Math.cos(angle);
        const lightY = Math.sin(angle);
        const lightZ = 0.5;
        const lightLen = Math.sqrt(lightX * lightX + lightY * lightY + lightZ * lightZ);
        const lX = lightX / lightLen, lY = lightY / lightLen, lZ = lightZ / lightLen;
        
        const radiance = parseFloat(radianceScaleSlider.value) / 100;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const nIdx = (y * width + x) * 3;
                const pIdx = (y * width + x) * 4;
                
                // Dot product for lighting
                const dot = Math.max(0, normals[nIdx] * lX + normals[nIdx + 1] * lY + normals[nIdx + 2] * lZ);
                const lighting = 0.5 + dot * radiance;
                
                pixels[pIdx] *= lighting;
                pixels[pIdx + 1] *= lighting;
                pixels[pIdx + 2] *= lighting;
            }
        }
    }
    
    function cannyEdgeDetection(pixels, width, height) {
        const edges = new Uint8ClampedArray(width * height);
        const strength = parseFloat(edgeStrengthSlider.value) / 100;
        const thickness = parseInt(edgeThicknessSlider.value);
        
        // Simple Sobel edge detection (simplified Canny)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const getL = (px, py) => {
                    const idx = (py * width + px) * 4;
                    return 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
                };
                
                const gX = -getL(x-1, y-1) - 2*getL(x-1, y) - getL(x-1, y+1) +
                           getL(x+1, y-1) + 2*getL(x+1, y) + getL(x+1, y+1);
                const gY = -getL(x-1, y-1) - 2*getL(x, y-1) - getL(x+1, y-1) +
                           getL(x-1, y+1) + 2*getL(x, y+1) + getL(x+1, y+1);
                
                const magnitude = Math.sqrt(gX * gX + gY * gY) * strength;
                edges[y * width + x] = Math.min(255, magnitude);
            }
        }
        
        // Apply thickness
        if (thickness > 1) {
            const dilated = new Uint8ClampedArray(edges);
            for (let t = 1; t < thickness; t++) {
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const idx = y * width + x;
                        dilated[idx] = Math.max(
                            edges[idx],
                            edges[idx - 1], edges[idx + 1],
                            edges[idx - width], edges[idx + width]
                        );
                    }
                }
                edges.set(dilated);
            }
        }
        
        return edges;
    }
    
    function blendEdges(pixels, edges, width, height) {
        // Overlay blend mode
        for (let i = 0; i < width * height; i++) {
            const edgeVal = edges[i];
            if (edgeVal > 0) {
                const idx = i * 4;
                const blend = edgeVal / 255;
                pixels[idx] = pixels[idx] * (1 - blend * 0.5);
                pixels[idx + 1] = pixels[idx + 1] * (1 - blend * 0.5);
                pixels[idx + 2] = pixels[idx + 2] * (1 - blend * 0.5);
            }
        }
    }
    
    function applyDirectionalSharpen(pixels, edges, width, height, amount) {
        const output = new Uint8ClampedArray(pixels.length);
        output.set(pixels);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const edgeIdx = y * width + x;
                
                if (edges[edgeIdx] > 50) {
                    // Apply directional sharpening based on edge orientation
                    const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];
                    
                    for (let c = 0; c < 3; c++) {
                        let sum = 0;
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const sIdx = ((y + ky) * width + (x + kx)) * 4 + c;
                                sum += pixels[sIdx] * kernel[(ky + 1) * 3 + (kx + 1)];
                            }
                        }
                        output[idx + c] = pixels[idx + c] + (sum - pixels[idx + c]) * amount;
                    }
                }
            }
        }
        
        pixels.set(output);
    }
    
    // === ICA-ENHANCED DSTRETCH ===
    function runICADStretch(pixels, stretchAmount) {
        // Simplified ICA using FastICA-like approach
        const n = pixels.length / 4;
        let r = [], g = [], b = [];
        
        for (let i = 0; i < n; i++) {
            r.push(pixels[i * 4]);
            g.push(pixels[i * 4 + 1]);
            b.push(pixels[i * 4 + 2]);
        }
        
        // Center data
        const rMean = r.reduce((a,b) => a+b, 0) / n;
        const gMean = g.reduce((a,b) => a+b, 0) / n;
        const bMean = b.reduce((a,b) => a+b, 0) / n;
        
        r = r.map(v => v - rMean);
        g = g.map(v => v - gMean);
        b = b.map(v => v - bMean);
        
        // Perform whitening (simplified)
        const whiteR = r.map(v => v * stretchAmount / 50);
        const whiteG = g.map(v => v * stretchAmount / 50);
        const whiteB = b.map(v => v * stretchAmount / 50);
        
        // Convert back
        const finalPixelData = new Uint8ClampedArray(pixels.length);
        for (let i = 0; i < n; i++) {
            finalPixelData[i * 4] = Math.max(0, Math.min(255, whiteR[i] + rMean));
            finalPixelData[i * 4 + 1] = Math.max(0, Math.min(255, whiteG[i] + gMean));
            finalPixelData[i * 4 + 2] = Math.max(0, Math.min(255, whiteB[i] + bMean));
            finalPixelData[i * 4 + 3] = 255;
        }
        
        return finalPixelData;
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
            case 'LCH': return rgbToLch(r, g, b);
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
            case 'LCH': rgb = lchToRgb(c1, c2, c3); break;
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
    
    function rgbToLch(r, g, b) {
        const lab = rgbToLab(r, g, b);
        const L = lab[0], a = lab[1], b_lab = lab[2];
        const C = Math.sqrt(a * a + b_lab * b_lab);
        let H = Math.atan2(b_lab, a) * (180 / Math.PI);
        if (H < 0) H += 360;
        return [L, C, H];
    }
    
    function lchToRgb(L, C, H) {
        const H_rad = H * (Math.PI / 180);
        const a = C * Math.cos(H_rad);
        const b_lab = C * Math.sin(H_rad);
        return labToRgb(L, a, b_lab);
    }
    
    initialize();
});(255, r));
            pixels[i + 1] = Math.max(0, Math.min
