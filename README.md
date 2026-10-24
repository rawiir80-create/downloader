# Downloader - Modern PWA Download Manager / مدير تحميلات حديث

A clean, modern download manager built as a Progressive Web App (PWA). Install it on your Android phone like a native app.

تطبيق مدير تحميلات حديث يعمل كـ PWA. ثبته على هاتفك الأندرويد كتطبيق أصلي.

## Features / المميزات

- 🎯 **Modern, simple UI** - Clean dark/light mode design / واجهة حديثة بسيطة - وضع ليلي/نهاري
- ⚡ **Fast downloads** - Streaming with progress, speed, ETA / تحميل سريع مع تقدم، سرعة، وقت متبقي
- ⏸️ **Pause/Resume** - Pause downloads and resume later / إيقاف واستكمال التحميلات
- 📱 **Installable PWA** - Add to home screen, works offline / يثبت على الشاشة الرئيسية، يعمل أوفلاين
- 🔔 **Notifications** - Get notified when downloads complete / إشعارات عند اكتمال التحميل
- 🌙 **Dark/Light mode** - Automatic system theme detection / كشف تلقائي لثيم النظام
- 💾 **Persistent history** - Downloads saved in IndexedDB / سجل تحميلات محفوظ في IndexedDB
- ⚙️ **Settings** - Concurrent downloads, auto-open, wake lock / إعدادات: تحميلات متزامنة، فتح تلقائي، إبقاء الشاشة
- 📋 **Paste to add** - Paste URL anywhere to start download / لصق رابط للبدء
- 🌐 **Multi-language** - Arabic (RTL) & English support / دعم العربية (RTL) والإنجليزية
- 🔗 **YouTube & Social** - Open in Cobalt for YouTube/supported sites / زر يوتيوب يفتح في Cobalt

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
├── index.html          # Main app / التطبيق الرئيسي
├── app.js              # Application logic / منطق التطبيق
├── sw.js               # Service Worker
├── manifest.json       # PWA manifest
├── icon.svg            # Source icon / الأيقونة الأصلية
├── generate-icons.html # Icon generator tool / أداة توليد الأيقونات
├── icon-*.png          # Generated icons (run generator) / أيقونات مولدة
└── README.md           # This file
```

## Permissions Used / الصلاحيات المستخدمة

- **Notifications** - Download completion alerts / إشعارات اكتمال التحميل
- **Wake Lock** - Keep screen on during downloads (optional) / إبقاء الشاشة مستيقظة (اختياري)
- **Storage** - IndexedDB for download history / تخزين سجل التحميلات

## Browser Support / دعم المتصفحات

- Chrome 80+ (Android)
- Edge 80+ (Android)
- Firefox 75+ (Android)
- Samsung Internet 12+
- Safari 16.4+ (iOS - limited PWA support)

## How It Works / كيف يعمل

1. **Downloads** use Fetch API + Streams for progress tracking / Fetch API + Streams للتقدم
2. **Files** saved via browser's native download (creates in Downloads folder) / حفظ عبر المتصفح في مجلد التنزيلات
3. **Progress** calculated from stream chunks / التقدم محسوب من قطع الاستREAM
4. **Pause/Resume** via AbortController (restarts from beginning due to browser limitations) / إيقاف/استكمال عبر AbortController (يعيد التحميل من البداية)
5. **History** stored in IndexedDB, survives browser restarts / السجل في IndexedDB، يبقى بعد إعادة تشغيل المتصفح

## Known Limitations / قيود معروفة

- ❌ Can't intercept system-wide downloads (like desktop IDM) / لا يعترض تحميلات النظام
- ❌ Pause/Resume restarts download (browser Range request limits) / الإيقاف/الاستكمال يعيد التحميل
- ❌ No background downloads when app closed (Service Worker limits) / لا تحميل في الخلفية عند إغلاق التطبيق
- ❌ Large files (>2GB) may fail (browser memory limits) / ملفات كبيرة (>2GB) قد تفشل
- ✅ Best for: direct file links, documents, media, archives / الأفضل لـ: روابط مباشرة، وثائق، وسائط، أرشيف

## YouTube & Social Media / يوتيوب ومواقع التواصل

This app downloads **direct file links only**. For YouTube, Twitter, Instagram, etc.:
- Paste the URL → **"Open in Cobalt"** button appears
- Click it to open [Cobalt](https://cobalt.tools) which extracts & downloads the media
- No backend/server needed - uses external service

هذا التطبيق يحمل **روابط ملفات مباشرة فقط**. لليوتيوب، تويتر، انستغرام، إلخ:
- ألصق الرابط → زر **"افتح في Cobalt"** سيظهر
- اضغطه ليفتح [Cobalt](https://cobalt.tools) يستخرج ويحمل الميديا
- لا يحتاج سيرفر/باكيند - يستخدم خدمة خارجية

## Customization / التخصيص

Edit `index.html` CSS variables (`:root`) to change colors:
```css
:root {
  --accent: #0066FF;        /* Primary color / اللون الأساسي */
  --bg: #0A0F1A;            /* Dark background / خلفية داكنة */
  --bg-elevated: #111827;   /* Card background / خلفية البطاقات */
  --radius: 12px;           /* Border radius / استدارة الزوايا */
}
```

## License / الترخيص

MIT - Feel free to modify and distribute / حر في التعديل والتوزيع.