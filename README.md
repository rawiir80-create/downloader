# Downloader - Modern PWA Download Manager

A clean, modern download manager built as a Progressive Web App (PWA). Install it on your Android phone like a native app.

## Features

- 🎯 **Modern, simple UI** - Clean dark/light mode design
- ⚡ **Fast downloads** - Streaming with progress, speed, ETA
- ⏸️ **Pause/Resume** - Pause downloads and resume later
- 📱 **Installable PWA** - Add to home screen, works offline
- 🔔 **Notifications** - Get notified when downloads complete
- 🌙 **Dark/Light mode** - Automatic system theme detection
- 💾 **Persistent history** - Downloads saved in IndexedDB
- ⚙️ **Settings** - Concurrent downloads, auto-open, wake lock
- 📋 **Paste to add** - Paste URL anywhere to start download

## Quick Start (Easiest)

### Option 1: GitHub Pages (Recommended - Free HTTPS)

1. Create a new GitHub repository
2. Push this folder to the repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOURUSERNAME/downloader.git
   git push -u origin main
   ```
3. Go to Settings → Pages → Source: "Deploy from a branch" → main → / (root)
4. Wait ~1 minute, then visit: `https://YOURUSERNAME.github.io/downloader/`
5. In Chrome: Menu → "Add to Home screen" or "Install app"

### Option 2: Local Network (If you have a computer)

```bash
# On your computer (with Node.js)
npx serve downloader --ssl
# Then access https://YOUR_COMPUTER_IP:3000 from phone
```

### Option 3: Direct File Access (Limited)

Open `index.html` directly in Chrome on your phone. 
**Limitations:** Service Worker won't register, no offline support, no install prompt.

## Generating Icons

Open `generate-icons.html` in Chrome on your phone or computer → click "Generate & Download All Icons" → move the downloaded PNG files to this folder.

## Project Structure

```
downloader/
├── index.html          # Main app
├── app.js              # Application logic
├── sw.js               # Service Worker
├── manifest.json       # PWA manifest
├── icon.svg            # Source icon
├── generate-icons.html # Icon generator tool
├── icon-*.png          # Generated icons (run generator)
└── README.md           # This file
```

## Permissions Used

- **Notifications** - Download completion alerts
- **Wake Lock** - Keep screen on during downloads (optional)
- **Storage** - IndexedDB for download history

## Browser Support

- Chrome 80+ (Android)
- Edge 80+ (Android)
- Firefox 75+ (Android)
- Samsung Internet 12+
- Safari 16.4+ (iOS - limited PWA support)

## How It Works

1. **Downloads** use Fetch API + Streams for progress tracking
2. **Files** saved via browser's native download (creates in Downloads folder)
3. **Progress** calculated from stream chunks
4. **Pause/Resume** via AbortController (restarts from beginning due to browser limitations)
5. **History** stored in IndexedDB, survives browser restarts

## Known Limitations

- ❌ Can't intercept system-wide downloads (like desktop IDM)
- ❌ Pause/Resume restarts download (browser Range request limits)
- ❌ No background downloads when app closed (Service Worker limits)
- ❌ Large files (>2GB) may fail (browser memory limits)
- ✅ Best for: direct file links, documents, media, archives

## Customization

Edit `index.html` CSS variables (`:root`) to change colors:
```css
:root {
  --accent: #0066FF;        /* Primary color */
  --bg: #0A0F1A;            /* Dark background */
  --bg-elevated: #111827;   /* Card background */
  --radius: 12px;           /* Border radius */
}
```

## License

MIT - Feel free to modify and distribute.