# DStretch Pro Plus+ 🎨

> Professional petroglyph and rock art enhancement tool combining traditional DStretch colorspace algorithms with advanced computational photography techniques.

**Version 2.0** - Complete Advanced Enhancement Suite

[![Live Demo](https://img.shields.io/badge/demo-live-blue)](https://dstretch-ai.netlify.app)
[![Version](https://img.shields.io/badge/version-2.0-green)](https://github.com/Xtact/dstretch-ai)

---

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [User Interface](#user-interface)
- [Enhancement Tools](#enhancement-tools)
- [Technical Details](#technical-details)
- [Deployment](#deployment)
- [Browser Compatibility](#browser-compatibility)

---

## ✨ Features

### 🎨 DStretch Enhancement
- **9 Colorspace Algorithms**: RGB, LAB, LCH, YRE, YYE, LRE, CRGB, YBK, LDS
- **Adjustable Stretch Amount**: 0-100% control
- **ICA Support**: Independent Component Analysis option
- **Bypass Toggle**: Use advanced features without DStretch

### 🔧 Standard Adjustments
- **Exposure** (-100 to +100)
- **Brightness** (-100 to +100)
- **Shadows** (0-100) - Lift shadow regions
- **Contrast** (-100 to +100)
- **Black Point** (0-50)
- **Saturation** (-100 to +100)
- **Sharpen** (0-100) - Unsharp mask

### 🚀 Advanced Enhancement Suite

#### Decorrelation Stretch (0-100%)
Reduces color correlation using standard deviation normalization to reveal hidden color variations.

#### Normal Map Generation
- Shape-from-shading algorithm
- Adjustable strength (0-100%)
- Calculates luminance gradients for pseudo-3D surface normals

#### Virtual Lighting Simulation
- **Light Angle**: 0-360° directional control
- **Light Intensity**: 0-100% radiance scaling
- Simulates oblique lighting to enhance relief features
- Real-time dot product shading

#### Canny Edge Detection
- Sobel gradient calculation
- **Edge Strength**: 0-100%
- **Edge Thickness**: 1-5px with morphological dilation
- Overlay blending with original image

#### Directional Unsharp Masking
- Edge-oriented sharpening (0-100%)
- Applies enhanced sharpening only at detected edges
- Preserves fine details while enhancing structure

### 🎯 Interactive Features

#### Zoom & Pan System
- **Zoom In/Out**: 1.3x increments, up to 500%
- **Pan**: Click and drag when zoomed
- **Percentage Display**: Real-time zoom level
- **Touch Support**: Full mobile compatibility

#### Tap-and-Hold Comparison
- Press and hold (500ms) to view original
- Visual "Original" indicator overlay
- Non-destructive preview
- Returns to processed image on release

#### History System
- Unlimited undo/redo
- Tracks all processing states
- Visual button state management

### 📸 Additional Tools
- **Camera Integration**: Capture photos directly
- **Drag & Drop Upload**: Easy file loading
- **PNG Export**: Download enhanced images
- **Auto Enhance**: One-click optimal settings

---

## 🚀 Quick Start

### Option 1: Visit Live Demo
👉 **[https://dstretch-ai.netlify.app](https://dstretch-ai.netlify.app)**

### Option 2: Deploy Your Own

1. **Clone the repository**
   ```bash
   git clone https://github.com/Xtact/dstretch-ai.git
   cd dstretch-ai
   ```

2. **Deploy to Netlify**
   - Drag the folder to [Netlify Drop](https://app.netlify.com/drop)
   - OR connect your GitHub repository
   - No build process required!

3. **Test Locally**
   ```bash
   # Serve with any static server
   python -m http.server 8000
   # Visit http://localhost:8000
   ```

---

## 🖥️ User Interface

### Layout

```
┌─────────────────────────────────────┐
│  Header - DStretch Pro Plus+        │  ← Undo/Redo
├─────────────────────────────────────┤
│                                     │
│     Image Workspace                 │  ← Main canvas
│     + Zoom Controls                 │     + Pan & Zoom
│                                     │     + Comparison
│                                     │
├─────────────────────────────────────┤
│  [Enhance] [Adjust] [Advanced] [Tools]│ ← Tabs
├─────────────────────────────────────┤
│                                     │
│     Control Panels                  │  ← Sliders & Toggles
│                                     │
└─────────────────────────────────────┘
```

### Control Panels

#### 📊 Enhance Panel
- DStretch toggle (ON/OFF)
- Colorspace selection dropdown
- DStretch amount slider
- ICA toggle
- Auto Enhance button

#### 🎨 Adjust Panel
- 7 adjustment sliders
- Real-time value display
- Reset All button

#### ⚙️ Advanced Panel
- 7 advanced enhancement sliders
- Light angle circular control
- Reset Advanced button

#### 🛠️ Tools Panel
- Camera button
- Download button
- About section with tips

---

## 🎨 Enhancement Tools

### DStretch Colorspaces Explained

| Colorspace | Best For | Description |
|------------|----------|-------------|
| **RGB** | General use | Standard Red-Green-Blue stretching |
| **LAB** | Color separation | Perceptual lightness, A-B color opponents |
| **LCH** | Hue preservation | Cylindrical LAB (Lightness-Chroma-Hue) |
| **YRE** | Red pigments | Yellow-Red Enhancement |
| **YYE** | Yellow pigments | Yellow Enhancement |
| **LRE** | Red ochre | Lab Red Enhancement |
| **CRGB** | Contrast boost | Custom RGB decorrelation |
| **YBK** | Dark pigments | Yellow-Blue-Black separation |
| **LDS** | Desaturation | Lab Desaturation for structure |

### Processing Pipeline

```
Original Image
    ↓
Decorrelation Stretch (if > 0)
    ↓
Standard Adjustments
    ├── Exposure/Brightness
    ├── Shadows/Contrast
    ├── Black Point
    ├── Saturation
    └── Sharpen
    ↓
Advanced Enhancements (if enabled)
    ├── Normal Map Generation
    ├── Virtual Lighting
    ├── Edge Detection
    └── Directional Sharpen
    ↓
DStretch Algorithm (if enabled)
    ├── Colorspace Conversion
    ├── PCA/ICA
    └── Stretch Application
    ↓
Final Image → History
```

### Recommended Workflows

#### 🎯 Standard DStretch Enhancement
1. Upload image
2. Enable "Apply DStretch Enhancement"
3. Select colorspace (LAB or LCH recommended)
4. Adjust DStretch amount slider
5. Fine-tune with standard adjustments
6. Download result

#### 🔬 Pure Computational Enhancement
1. Upload image
2. **Disable "Apply DStretch Enhancement"**
3. Enable Normal Mapping (30-50%)
4. Add Edge Detection (20-30%)
5. Adjust virtual lighting angle
6. Export standalone advanced enhancement

#### 🔍 Comparative Analysis
1. Process with DStretch
2. Toggle DStretch on/off to compare
3. Use zoom to inspect details
4. Hold image to view original
5. Export preferred version

---

## 🔧 Technical Details

### Architecture
- **Client-Side Processing**: No server required
- **Web Workers**: Background thread for heavy processing
- **Vanilla JavaScript**: No framework dependencies
- **Progressive Enhancement**: Graceful degradation

### Performance Optimizations
- **Debounced Processing**: 150ms delay prevents excessive reprocessing
- **RequestAnimationFrame**: Smooth UI updates
- **Web Worker Offloading**: Heavy math in background thread
- **Efficient Pixel Operations**: Direct Uint8ClampedArray manipulation

### File Structure
```
dstretch-ai/
├── index.html          # Main UI structure (with MathJS CDN)
├── style.css           # Complete iOS-inspired styling
├── script.js           # Application logic (~1400 lines)
├── worker.js           # Web Worker for processing
└── README.md           # This file
```

### Dependencies
- **MathJS 11.7.0**: Eigenvalue decomposition for PCA (CDN)
- No other external dependencies

---

## 🌐 Deployment

### GitHub Pages
```bash
# Enable GitHub Pages in repository settings
# Select "main" branch
# Visit: https://yourusername.github.io/dstretch-ai
```

### Netlify (Recommended)
1. Connect GitHub repository
2. No build command needed
3. Publish directory: `/` (root)
4. Auto-deploy on push to main

### Vercel
```bash
vercel deploy
```

### Static Hosting Requirements
- ✅ Static file serving
- ✅ HTTPS (recommended for camera access)
- ✅ CDN support for MathJS
- ❌ No server-side processing needed
- ❌ No build process required

---

## 🌍 Browser Compatibility

### Minimum Requirements
- Canvas API support
- ES6+ JavaScript
- CSS Grid & Flexbox
- File API
- Web Workers (optional, with fallback)

### Tested Platforms
| Browser | Version | Status |
|---------|---------|--------|
| Chrome/Edge | 90+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Mobile Safari | iOS 14+ | ✅ Touch optimized |
| Chrome Mobile | Android 10+ | ✅ Touch optimized |

### Known Limitations
- Large images (>8MP) may be slow without Web Workers
- Camera requires HTTPS
- No localStorage (by design)

---

## 📊 Use Cases

### Primary Users
1. **Archaeologists** - Petroglyph documentation and analysis
2. **Rock Art Researchers** - Feature enhancement and discovery
3. **Conservationists** - Non-invasive documentation
4. **Amateur Enthusiasts** - Recreational rock art photography

### Real-World Applications
- Digital archaeology documentation
- Rock art site surveys
- Publication-quality images
- Educational materials
- Conservation monitoring
- Comparative studies

---

## 🎓 Tips & Tricks

### Getting Best Results

1. **Start with Good Photos**
   - Even lighting (avoid harsh shadows)
   - High resolution (3+ megapixels)
   - Minimal JPEG compression

2. **DStretch Settings**
   - Try LAB or LCH first
   - Start with 100% amount, reduce if over-processed
   - Compare multiple colorspaces

3. **Advanced Enhancements**
   - Normal mapping works best with relief features
   - Adjust light angle to match natural lighting
   - Edge detection enhances linear features

4. **Performance**
   - Process smaller images first
   - Use Web Workers for large files
   - Debounce is automatic (no rapid adjustments needed)

### Keyboard Shortcuts
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Shift + Z**: Redo
- **Space + Drag**: Pan (when zoomed)

---

## 🔮 Future Enhancements

### Planned Features
- [ ] Batch processing (multiple images)
- [ ] Preset system (save/load settings)
- [ ] Side-by-side comparison view
- [ ] TIFF export support
- [ ] Measurement tools
- [ ] Annotation system
- [ ] Keyboard shortcuts panel

### Research Integration Possibilities
- GMM (Gaussian Mixture Models) for motif detection
- Advanced ICA implementations
- Machine learning enhancement models
- Multi-spectral imaging support

---

## 📝 Version History

### Version 2.0 (Current)
- ✅ Complete advanced enhancement suite
- ✅ 9 DStretch colorspaces
- ✅ Normal map generation
- ✅ Virtual lighting simulation
- ✅ Canny edge detection
- ✅ Directional sharpening
- ✅ Decorrelation stretch
- ✅ Tap-and-hold comparison
- ✅ Zoom percentage display
- ✅ Debounced processing
- ✅ Full mobile optimization

### Version 1.0
- Basic DStretch enhancement
- 5 colorspaces
- Standard adjustments
- Zoom & pan
- Undo/redo
---

## 📧 Support

- **GitHub Issues**: [Report bugs](https://github.com/Xtact/dstretch-ai/issues)
- **Discussions**: [Ask questions](https://github.com/Xtact/dstretch-ai/discussions)

---

**Made with ❤️ for rock art researchers worldwide**
