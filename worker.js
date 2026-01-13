// DStretch Pro Plus+ - Web Worker for Advanced Image Processing
// Version: 2.0 - Complete Feature Set

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch(type) {
        case 'applyDStretch':
            applyDStretch(data);
            break;
        case 'applyAdvanced':
            applyAdvanced(data);
            break;
        case 'applyComplete':
            applyComplete(data);
            break;
        default:
            console.warn('Unknown worker task:', type);
    }
};

function applyDStretch(data) {
    const { imageData, colorspace, amount } = data;
    const pixels = imageData.data;
    
    switch(colorspace) {
        case 'rgb':
            applyRGBStretch(pixels, amount);
            break;
        case 'lab':
            applyLABStretch(pixels, amount);
            break;
        case 'lch':
            applyLCHStretch(pixels, amount);
            break;
        case 'yre':
            applyYREStretch(pixels, amount);
            break;
        case 'yye':
            applyYYEStretch(pixels, amount);
            break;
        case 'lre':
            applyLREStretch(pixels, amount);
            break;
        case 'crgb':
            applyCRGBStretch(pixels, amount);
            break;
        case 'ybk':
            applyYBKStretch(pixels, amount);
            break;
        case 'lds':
            applyLDSStretch(pixels, amount);
            break;
    }
    
    self.postMessage({
        type: 'dstretchComplete',
        imageData: imageData
    }, [imageData.data.buffer]);
}

function applyRGBStretch(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = stretch(pixels[i], amount);
        pixels[i + 1] = stretch(pixels[i + 1], amount);
        pixels[i + 2] = stretch(pixels[i + 2], amount);
    }
}

function applyLABStretch(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
        const [l, a, b] = rgbToLab(pixels[i], pixels[i + 1], pixels[i + 2]);
        const stretched = rgbFromLab(
            l,
            stretch(a + 128, amount) - 128,
            stretch(b + 128, amount) - 128
        );
        pixels[i] = stretched[0];
        pixels[i + 1] = stretched[1];
        pixels[i + 2] = stretched[2];
    }
}

function applyLCHStretch(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
        const [l, a, b] = rgbToLab(pixels[i], pixels[i + 1], pixels[i + 2]);
        const c = Math.sqrt(a * a + b * b);
        const h = Math.atan2(b, a);
        
        const stretchedC = c * (1 + amount);
        const newA = stretchedC * Math.cos(h);
        const newB = stretchedC * Math.sin(h);
        
        const stretched = rgbFromLab(l, newA, newB);
        pixels[i] = stretched[0];
        pixels[i + 1] = stretched[1];
        pixels[i + 2] = stretched[2];
    }
}

function applyYREStretch(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        pixels[i] = Math.min(255, r * (1 + 0.3 * amount));
        pixels[i + 1] = Math.min(255, g * (1 + 0.1 * amount));
        pixels[i + 2] = b * (1 - 0.3 * amount);
    }
}

function applyYYEStretch(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        pixels[i] = Math.min(255, r * (1 + 0.2 * amount));
        pixels[i + 1] = Math.min(255, g * (1 + 0.2 * amount));
        pixels[i + 2] = b * (1 - 0.2 * amount);
    }
}

function applyLREStretch(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const l = 0.299 * r + 0.587 * g + 0.114 * b;

        pixels[i] = Math.min(255, l * 0.5 + r * (0.5 + 0.5 * amount));
        pixels[i + 1] = g * (1 - 0.2 * amount);
        pixels[i + 2] = b * (1 - 0.2 * amount);
    }
}

function applyCRGBStretch(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        pixels[i] = Math.min(255, (r - g - b + 510) / 2 * (1 + amount));
        pixels[i + 1] = Math.min(255, (g - r - b + 510) / 2 * (1 + amount));
        pixels[i + 2] = Math.min(255, (b - r - g + 510) / 2 * (1 + amount));
    }
}

function applyYBKStretch(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        const y = (r + g) / 2;
        const bComp = b;

        pixels[i] = Math.min(255, y * (1 + 0.2 * amount));
        pixels[i + 1] = Math.min(255, y * (1 + 0.2 * amount));
        pixels[i + 2] = Math.min(255, bComp * (1 + 0.3 * amount));
    }
}

function applyLDSStretch(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        pixels[i] = gray * amount + r * (1 - amount);
        pixels[i + 1] = gray * amount + g * (1 - amount);
        pixels[i + 2] = gray * amount + b * (1 - amount);
    }
}

function stretch(value, amount) {
    return Math.max(0, Math.min(255, 128 + (value - 128) * (1 + amount)));
}

// RGB to LAB color space conversion
function rgbToLab(r, g, b) {
    // RGB to XYZ
    r = r / 255;
    g = g / 255;
    b = b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    // XYZ to LAB
    x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

    return [
        (116 * y) - 16,
        500 * (x - y),
        200 * (y - z)
    ];
}

// LAB to RGB color space conversion
function rgbFromLab(l, a, b) {
    // LAB to XYZ
    let y = (l + 16) / 116;
    let x = a / 500 + y;
    let z = y - b / 200;

    x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16 / 116) / 7.787);
    y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16 / 116) / 7.787);
    z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16 / 116) / 7.787);

    // XYZ to RGB
    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let blu = x * 0.0557 + y * -0.2040 + z * 1.0570;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    blu = blu > 0.0031308 ? 1.055 * Math.pow(blu, 1 / 2.4) - 0.055 : 12.92 * blu;

    return [
        Math.max(0, Math.min(255, r * 255)),
        Math.max(0, Math.min(255, g * 255)),
        Math.max(0, Math.min(255, blu * 255))
    ];
}

// Advanced enhancement functions
function applyAdvanced(data) {
    const { imageData, params } = data;
    
    // Apply decorrelation stretch if needed
    if (params.decorrelation > 0) {
        applyDecorrelationStretch(imageData, params.decorrelation / 100);
    }
    
    // Apply standard adjustments
    applyAdjustments(imageData, params);
    
    self.postMessage({
        type: 'advancedComplete',
        imageData: imageData
    }, [imageData.data.buffer]);
}

function applyDecorrelationStretch(imageData, amount) {
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
}

function applyAdjustments(imageData, params) {
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

        // Shadows
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
}

function applyComplete(data) {
    const { imageData } = data;
    
    self.postMessage({
        type: 'processingComplete',
        imageData: imageData
    }, [imageData.data.buffer]);
}
