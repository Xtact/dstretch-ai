# DStretch AI Pro - Deployment Guide

## 📁 Files Needed

You need to create **4 files** in a folder:

1. `index.html`
2. `style.css`
3. `worker.js`
4. `script.js`

## 📋 How to Get the Files

All 4 files are available as artifacts in this conversation. Look for these artifact titles:

1. **"index.html - DStretch AI Pro"**
2. **"style.css - DStretch AI Pro"**
3. **"worker.js - DStretch AI Pro"**
4. **"script.js - DStretch AI Pro"**

## 💾 Steps to Download

For each artifact above:

1. Click on the artifact title in the conversation
2. Look for the **copy button** (usually in the top-right corner)
3. Copy the entire content
4. Create a new file with the correct name
5. Paste the content
6. Save the file

## 📂 Folder Structure

```
dstretch-ai-pro/
├── index.html
├── style.css
├── worker.js
└── script.js
```

## 🚀 Deploy to Netlify

### Option 1: Drag & Drop
1. Put all 4 files in a folder
2. Go to https://app.netlify.com/drop
3. Drag the folder into the upload area
4. Done! Your site is live

### Option 2: Connect GitHub
1. Create a new repository
2. Upload all 4 files
3. Connect to Netlify
4. Deploy automatically

## ✅ Test Locally First

Open `index.html` in your browser to test before deploying.

**Note:** The Web Worker (`worker.js`) may not work locally due to CORS restrictions. Deploy to Netlify for full functionality.

## 🎯 Features Included

- ✅ DStretch colorspace enhancement
- ✅ Image adjustments (exposure, contrast, etc.)
- ✅ Undo/Redo history
- ✅ AI Auto-Enhance
- ✅ Live video processing
- ✅ Frame capture from camera
- ✅ Super Resolution (coming soon placeholder)
- ✅ iOS-style interface

## 📱 Mobile Optimized

The app works great on:
- iOS Safari
- Android Chrome
- Desktop browsers

## 🔧 Troubleshooting

**Web Worker not working?**
- Make sure all 4 files are in the same directory
- Deploy to a web server (Netlify, Vercel, etc.)
- Don't open from `file://` protocol

**Camera not working?**
- Allow camera permissions when prompted
- Use HTTPS (Netlify provides this automatically)
- Some browsers require user interaction first

## 📞 Need Help?

If you encounter any issues, check that:
1. All 4 files are saved correctly
2. File names match exactly (case-sensitive)
3. Files are in the same folder
4. You're accessing via HTTPS on Netlify
