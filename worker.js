    // Web Worker for DStretch processing
// This offloads heavy computation from the main thread

self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.7.0/math.min.js');

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    if (type === 'PROCESS_DSTRETCH') {
        try {
            const result = processDStretch(data);
            self.postMessage({ type: 'DSTRETCH_COMPLETE', data: result });
        } catch (error) {
            self.postMessage({ type: 'DSTRETCH_ERROR', error: error.message });
        }
    }
};

function processDStretch(data) {
    const { imageData, colorspace, stretchAmount } = data;
    const nPixels = imageData.length / 4;
    let c1 = [], c2 = [], c3 = [];

    // Convert pixels to selected colorspace
    for (let i = 0; i < nPixels; i++) {
        const r = imageData[i * 4];
        const g = imageData[i * 4 + 1];
        const b = imageData[i * 4 + 2];
        const converted = convertRgbTo(r, g, b, colorspace);
        c1.push(converted[0]);
        c2.push(converted[1]);
        c3.push(converted[2]);
    }
    
    // Perform DStretch algorithm
    const { stretchedC1, stretchedC2, stretchedC3 } = performDstretch(c1, c2, c3, stretchAmount);

    // Convert back to RGB
    const finalPixelData = new Uint8ClampedArray(imageData.length);
    for (let i = 0; i < nPixels; i++) {
        const rgb = convertToRgb(stretchedC1[i], stretchedC2[i], stretchedC3[i], colorspace);
        const pixelIndex = i * 4;
        finalPixelData[pixelIndex] = rgb[0];
        finalPixelData[pixelIndex + 1] = rgb[1];
        finalPixelData[pixelIndex + 2] = rgb[2];
        finalPixelData[pixelIndex + 3] = 255;
    }
    
    return finalPixelData;
}

function performDstretch(c1, c2, c3, stretchAmount) {
    const meanC1 = calculateMean(c1);
    const meanC2 = calculateMean(c2);
    const meanC3 = calculateMean(c3);
    
    const covMatrix = calculateCovarianceMatrix(c1, c2, c3, meanC1, meanC2, meanC3);
    const { eigenvectors, eigenvalues } = eigenDecomposition(covMatrix);
    
    let stretchedC1 = [], stretchedC2 = [], stretchedC3 = [];

    for (let i = 0; i < c1.length; i++) {
        const v1 = c1[i] - meanC1;
        const v2 = c2[i] - meanC2;
        const v3 = c3[i] - meanC3;
        
        // Project onto eigenvector basis
        let p1 = v1 * eigenvectors[0][0] + v2 * eigenvectors[1][0] + v3 * eigenvectors[2][0];
        let p2 = v1 * eigenvectors[0][1] + v2 * eigenvectors[1][1] + v3 * eigenvectors[2][1];
        let p3 = v1 * eigenvectors[0][2] + v2 * eigenvectors[1][2] + v3 * eigenvectors[2][2];
        
        // Apply stretch
        p1 *= (stretchAmount / Math.sqrt(Math.abs(eigenvalues[0]) || 1));
        p2 *= (stretchAmount / Math.sqrt(Math.abs(eigenvalues[1]) || 1));
        p3 *= (stretchAmount / Math.sqrt(Math.abs(eigenvalues[2]) || 1));
        
        // Project back to original space
        stretchedC1[i] = p1 * eigenvectors[0][0] + p2 * eigenvectors[0][1] + p3 * eigenvectors[0][2] + meanC1;
        stretchedC2[i] = p1 * eigenvectors[1][0] + p2 * eigenvectors[1][1] + p3 * eigenvectors[1][2] + meanC2;
        stretchedC3[i] = p1 * eigenvectors[2][0] + p2 * eigenvectors[2][1] + p3 * eigenvectors[2][2] + meanC3;
    }
    
    return { stretchedC1, stretchedC2, stretchedC3 };
}

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
        // Fallback to identity if decomposition fails
        return {
            eigenvectors: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
            eigenvalues: [1, 1, 1]
        };
    }
}

function convertRgbTo(r, g, b, colorspace) {
    switch (colorspace) {
        case 'LAB':
            return rgbToLab(r, g, b);
        case 'YRE':
            return [0.299 * r + 0.587 * g + 0.114 * b, r, g];
        case 'LRE':
            return [0.2126 * r + 0.7152 * g + 0.0722 * b, r, g];
        case 'CRGB':
            return [r, g, b];
        case 'YBK':
            return [0.299 * r + 0.587 * g + 0.114 * b, b, 255 - g];
        default: // RGB
            return [r, g, b];
    }
}

function convertToRgb(c1, c2, c3, colorspace) {
    let rgb;
    switch (colorspace) {
        case 'LAB':
            rgb = labToRgb(c1, c2, c3);
            break;
        case 'YRE':
            rgb = [c2, c3, (c1 - 0.587 * c3 - 0.299 * c2) / 0.114];
            break;
        case 'LRE':
            rgb = [c2, c3, (c1 - 0.7152 * c3 - 0.2126 * c2) / 0.0722];
            break;
        case 'CRGB':
            rgb = [c1, c2, c3];
            break;
        case 'YBK':
            rgb = [(c1 - 0.587 * (255 - c3) - 0.114 * c2) / 0.299, 255 - c3, c2];
            break;
        default: // RGB
            rgb = [c1, c2, c3];
    }
    
    // Clamp values
    return [
        Math.max(0, Math.min(255, rgb[0])),
        Math.max(0, Math.min(255, rgb[1])),
        Math.max(0, Math.min(255, rgb[2]))
    ];
}

function rgbToLab(r, g, b) {
    // Normalize RGB values
    r /= 255;
    g /= 255;
    b /= 255;
    
    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    
    // Convert to XYZ
    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;
    
    // Normalize for D65 illuminant
    x /= 95.047;
    y /= 100.000;
    z /= 108.883;
    
    // Apply Lab transformation
    x = x > 0.008856 ? Math.cbrt(x) : (7.787 * x + 16 / 116);
    y = y > 0.008856 ? Math.cbrt(y) : (7.787 * y + 16 / 116);
    z = z > 0.008856 ? Math.cbrt(z) : (7.787 * z + 16 / 116);
    
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

function labToRgb(l, a, b_lab) {
    let y = (l + 16) / 116;
    let x = a / 500 + y;
    let z = y - b_lab / 200;
    
    const x3 = x * x * x;
    const y3 = y * y * y;
    const z3 = z * z * z;
    
    x = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
    y = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
    z = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;
    
    x *= 95.047;
    y *= 100.000;
    z *= 108.883;
    
    x /= 100;
    y /= 100;
    z /= 100;
    
    // Convert XYZ to RGB
    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b = x * 0.0557 + y * -0.2040 + z * 1.0570;
    
    // Apply gamma correction
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;
    
    return [r * 255, g * 255, b * 255];
}
