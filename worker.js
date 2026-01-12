// DStretch Pro Plus+ - Web Worker for Image Processing
// Handles heavy image processing tasks off the main thread

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch(type) {
        case 'applyDStretch':
            applyDStretch(data);
            break;
        case 'applyAdjustments':
            applyAdjustments(data);
            break;
        case 'autoEnhance':
            autoEnhance(data);
            break;
        default:
            console.warn('Unknown worker task:', type);
    }
};

function applyDStretch(data) {
    const { imageData, colorspace } = data;
    const pixels = imageData.data;
    
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
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
        
        pixels[i] = Math.max(0, Math.min(255, newR));
        pixels[i + 1] = Math.max(0, Math.min(255, newG));
        pixels[i + 2] = Math.max(0, Math.min(255, newB));
    }
    
    self.postMessage({
        type: 'dstretchComplete',
        imageData: imageData
    }, [imageData.data.buffer]);
}

function applyAdjustments(data) {
    const { imageData, adjustments } = data;
    const pixels = imageData.data;
    const { exposure, contrast, saturation, sharpness } = adjustments;
    
    const exposureFactor = 1 + exposure / 100;
    const contrastFactor = (contrast + 100) / 100;
    const saturationFactor = 1 + saturation / 100;
    
    for (let i = 0; i < pixels.length; i += 4) {
        let r = pixels[i];
        let g = pixels[i + 1];
        let b = pixels[i + 2];
        
        // Apply exposure
        r *= exposureFactor;
        g *= exposureFactor;
        b *= exposureFactor;
        
        // Apply contrast
        r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;
        
        // Apply saturation
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * saturationFactor;
        g = gray + (g - gray) * saturationFactor;
        b = gray + (b - gray) * saturationFactor;
        
        pixels[i] = Math.max(0, Math.min(255, r));
        pixels[i + 1] = Math.max(0, Math.min(255, g));
        pixels[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    // Apply sharpness if needed
    if (sharpness > 0) {
        applySharpness(imageData, sharpness / 100);
    }
    
    self.postMessage({
        type: 'adjustmentsComplete',
        imageData: imageData
    }, [imageData.data.buffer]);
}

function applySharpness(imageData, amount) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;
    const original = new Uint8ClampedArray(pixels);
    
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
                pixels[idx] = original[idx] * (1 - amount) + sum * amount;
            }
        }
    }
}

function autoEnhance(data) {
    const { imageData } = data;
    
    // First apply DStretch YRE
    applyDStretch({
        imageData: imageData,
        colorspace: 'yre'
    });
    
    // Then apply optimal adjustments
    applyAdjustments({
        imageData: imageData,
        adjustments: {
            exposure: 0,
            contrast: 20,
            saturation: 15,
            sharpness: 10
        }
    });
    
    self.postMessage({
        type: 'autoEnhanceComplete',
        imageData: imageData
    }, [imageData.data.buffer]);
}

// Helper function for histogram analysis (for future auto-enhance improvements)
function analyzeHistogram(imageData) {
    const pixels = imageData.data;
    const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0),
        luminance: new Array(256).fill(0)
    };
    
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        
        histogram.r[r]++;
        histogram.g[g]++;
        histogram.b[b]++;
        histogram.luminance[lum]++;
    }
    
    return histogram;
}

// Helper function to find optimal enhancement parameters
function findOptimalParameters(histogram) {
    // Calculate mean luminance
    let totalPixels = 0;
    let sumLuminance = 0;
    
    for (let i = 0; i < 256; i++) {
        totalPixels += histogram.luminance[i];
        sumLuminance += i * histogram.luminance[i];
    }
    
    const meanLuminance = sumLuminance / totalPixels;
    
    // Suggest exposure adjustment based on mean luminance
    let exposure = 0;
    if (meanLuminance < 100) {
        exposure = Math.round((100 - meanLuminance) / 2);
    } else if (meanLuminance > 155) {
        exposure = -Math.round((meanLuminance - 155) / 2);
    }
    
    // Suggest contrast based on histogram spread
    const stdDev = calculateStdDev(histogram.luminance, meanLuminance);
    let contrast = stdDev < 50 ? 30 : 15;
    
    return {
        exposure: Math.max(-50, Math.min(50, exposure)),
        contrast: contrast,
        saturation: 15,
        sharpness: 10
    };
}

function calculateStdDev(histogram, mean) {
    let totalPixels = 0;
    let variance = 0;
    
    for (let i = 0; i < 256; i++) {
        totalPixels += histogram[i];
        variance += histogram[i] * Math.pow(i - mean, 2);
    }
    
    return Math.sqrt(variance / totalPixels);
}
