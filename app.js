// Downloader PWA - Main Application Logic
// Handles downloads, IndexedDB persistence, UI updates, notifications
import { isMediaUrl, resolveMedia, platformKey } from './media.js';

const DB_NAME = 'DownloaderDB';
const DB_VERSION = 1;
const STORE_NAME = 'downloads';

let db = null;
let deferredPrompt = null;
let wakeLock = null;
let activeDownloads = new Map(); // id -> { controller, xhr, startTime, paused, speedHistory }
let downloadQueue = [];
const MAX_CONCURRENT = 2; // default, updated from settings

// Settings
let settings = {
  autoOpen: true,
  maxConcurrent: 2,
  notifications: true,
  wakeLock: false,
  language: 'ar' // 'ar' or 'en'
};

// Translations
const T = {
  ar: {
    downloads: 'التحميلات',
    noDownloads: 'لا توجد تحميلات بعد',
    addUrl: 'أضف رابط أعلاه لبدء التحميل',
    downloadUrl: 'رابط التحميل',
    filename: 'اسم الملف (اختياري)',
    autoDetect: 'يستخرج تلقائياً من الرابط',
    startDownload: 'بدء التحميل',
    openInCobalt: 'فتح في Cobalt (لليوتيوب والمواقع المدعومة)',
    openExternal: 'فتح في Cobalt خارجياً',
    mediaVideo: 'تحميل فيديو',
    mediaAudio: 'تحميل صوت MP3',
    mediaDetected: 'منصة مدعومة — اختر النوع:',
    resolving: 'جاري استخراج رابط التحميل…',
    mediaReady: 'تم تجهيز الرابط — بدأ التحميل',
    mediaFail: 'فشل الاستخراج من كل السيرفرات',
    mediaFailHint: 'جرب زر (فتح في Cobalt خارجياً) أو أعد المحاولة لاحقاً',
    platform_youtube: 'يوتيوب',
    platform_tiktok: 'تيك توك',
    platform_instagram: 'انستقرام',
    platform_twitter: 'تويتر / X',
    platform_facebook: 'فيسبوك',
    platform_soundcloud: 'ساوندكلاود',
    platform_vk: 'VK',
    platform_dailymotion: 'ديلي موشن',
    platform_twitch: 'تويتش',
    platform_pinterest: 'بينترست',
    platform_tumblr: 'تمبلر',
    platform_bilibili: 'بيلي بيلي',
    platform_rutube: 'روتيوب',
    platform_bluesky: 'بلوسكاي',
    platform_other: 'منصة مدعومة',
    settings: 'الإعدادات',
    autoOpen: 'فتح تلقائي بعد التحميل',
    autoOpenDesc: 'فتح الملفات تلقائياً بعد اكتمال التحميل',
    concurrent: 'تحميلات متزامنة',
    concurrentDesc: 'الحد الأقصى للتحميلات في نفس الوقت',
    notifications: 'عرض الإشعارات',
    notificationsDesc: 'إشعارات المتصفح عند اكتمال التحميل',
    wakeLock: 'إبقاء الشاشة مستيقظة',
    wakeLockDesc: 'منع النوم أثناء التحميلات النشطة',
    clearHistory: 'مسح السجل',
    clearHistoryDesc: 'إزالة جميع التحميلات المكتملة من القائمة',
    clearConfirm: 'مسح جميع التحميلات المكتملة من السجل؟',
    addedToQueue: 'تمت إضافة للتحميل',
    downloadComplete: 'اكتمل التحميل',
    downloadFailed: 'فشل التحميل',
    installed: 'تم التثبيت',
    addedToHome: 'تم إضافة Downloader للشاشة الرئيسية',
    pause: 'إيقاف',
    resume: 'استئناف',
    cancel: 'إلغاء',
    retry: 'إعادة محاولة',
    remove: 'إزالة',
    open: 'فتح',
    queued: 'في الانتظار',
    downloading: 'جاري التحميل',
    paused: 'متوقف',
    complete: 'مكتمل',
    error: 'خطأ',
    openFileMsg: 'استخدم مدير الملفات لفتح الملفات المحملة',
    clearSuccess: 'تم مسح التحميلات المكتملة',
    oneAtTime: 'واحد في كل مرة',
    twoAtTime: 'اثنين في نفس الوقت',
    threeAtTime: 'ثلاثة في نفس وقت',
    fourAtTime: 'أربعة في نفس وقت',
    installApp: 'ثبت Downloader',
    installDesc: 'أضف للشاشة الرئيسية لتجربة كتطبيق أصلي',
    installBtn: 'تثبيت'
  },
  en: {
    downloads: 'Downloads',
    noDownloads: 'No downloads yet',
    addUrl: 'Add a URL above to start downloading',
    downloadUrl: 'Download URL',
    filename: 'Filename (optional)',
    autoDetect: 'Auto-detect from URL',
    startDownload: 'Start Download',
    openInCobalt: 'Open in Cobalt (for YouTube & supported sites)',
    openExternal: 'Open in Cobalt externally',
    mediaVideo: 'Download video',
    mediaAudio: 'Download MP3 audio',
    mediaDetected: 'Supported platform — pick format:',
    resolving: 'Resolving download link…',
    mediaReady: 'Link ready — download started',
    mediaFail: 'All servers failed to resolve',
    mediaFailHint: 'Try the (Open in Cobalt) button or retry later',
    platform_youtube: 'YouTube',
    platform_tiktok: 'TikTok',
    platform_instagram: 'Instagram',
    platform_twitter: 'Twitter / X',
    platform_facebook: 'Facebook',
    platform_soundcloud: 'SoundCloud',
    platform_vk: 'VK',
    platform_dailymotion: 'Dailymotion',
    platform_twitch: 'Twitch',
    platform_pinterest: 'Pinterest',
    platform_tumblr: 'Tumblr',
    platform_bilibili: 'Bilibili',
    platform_rutube: 'Rutube',
    platform_bluesky: 'Bluesky',
    platform_other: 'Supported platform',
    settings: 'Settings',
    autoOpen: 'Auto-open completed',
    autoOpenDesc: 'Open files automatically after download',
    concurrent: 'Concurrent downloads',
    concurrentDesc: 'Maximum simultaneous downloads',
    notifications: 'Show notifications',
    notificationsDesc: 'Browser notifications for completed downloads',
    wakeLock: 'Keep screen awake',
    wakeLockDesc: 'Prevent sleep during active downloads',
    clearHistory: 'Clear history',
    clearHistoryDesc: 'Remove all completed downloads from list',
    clearConfirm: 'Clear all completed downloads from history?',
    addedToQueue: 'Added to queue',
    downloadComplete: 'Download complete',
    downloadFailed: 'Download failed',
    installed: 'Installed',
    addedToHome: 'Downloader added to home screen',
    pause: 'Pause',
    resume: 'Resume',
    cancel: 'Cancel',
    retry: 'Retry',
    remove: 'Remove',
    open: 'Open',
    queued: 'Queued',
    downloading: 'Downloading',
    paused: 'Paused',
    complete: 'Complete',
    error: 'Error',
    openFileMsg: 'Use your file manager to open downloaded files',
    clearSuccess: 'Completed downloads removed',
    oneAtTime: '1 at a time',
    twoAtTime: '2 at a time',
    threeAtTime: '3 at a time',
    fourAtTime: '4 at a time',
    installApp: 'Install Downloader',
    installDesc: 'Add to home screen for app-like experience',
    installBtn: 'Install'
  }
};

function t(key) {
  return T[settings.language][key] || key;
}

// DOM Elements
const addSection = document.getElementById('addSection');
const addForm = document.getElementById('addForm');
const urlInput = document.getElementById('urlInput');
const filenameInput = document.getElementById('filenameInput');
const downloadsList = document.getElementById('downloadsList');
const emptyState = document.getElementById('emptyState');
const downloadCount = document.getElementById('downloadCount');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const autoOpenToggle = document.getElementById('autoOpenToggle');
const concurrentSelect = document.getElementById('concurrentSelect');
const notifyToggle = document.getElementById('notifyToggle');
const wakeLockToggle = document.getElementById('wakeLockToggle');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const toastContainer = document.getElementById('toastContainer');
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');
const langBtn = document.getElementById('langBtn');
const mediaPanel = document.getElementById('mediaPanel');
const mediaPlatform = document.getElementById('mediaPlatform');
const mediaVideoBtn = document.getElementById('mediaVideoBtn');
const mediaAudioBtn = document.getElementById('mediaAudioBtn');
const openInCobaltBtn = document.getElementById('openInCobaltBtn');
const downloadsTitle = document.getElementById('downloadsTitle');

// Icons SVG
const ICONS = {
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
  audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 16 17"/><path d="M10 11V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"/><rect x="2" y="17" width="20" height="4" rx="1"/></svg>',
  document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
};

// Initialize
async function init() {
  await initDB();
  loadSettings();
  applyLanguage();
  await loadDownloads();
  registerServiceWorker();
  setupEventListeners();
  checkInstallPrompt();
  requestNotificationPermission();
  updateUI();
}

// IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(); };
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

function dbTransaction(mode, callback) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    callback(store);
  });
}

async function saveDownload(download) {
  await dbTransaction('readwrite', store => store.put(download));
}

async function deleteDownload(id) {
  await dbTransaction('readwrite', store => store.delete(id));
}

async function loadDownloads() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev');
    const downloads = [];
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        downloads.push(cursor.value);
        cursor.continue();
      } else {
        downloads.forEach(d => restoreDownload(d));
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function clearCompletedDownloads() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.openCursor(IDBKeyRange.only('complete'));
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      document.querySelectorAll('.download-item[data-status="complete"]').forEach(el => removeItemElement(el));
      updateUI();
      showToast('success', t('installed'), t('clearSuccess'));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// Download Logic
function generateId() {
  return 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getFileIcon(filename, mimeType) {
  const ext = filename.split('.').pop().toLowerCase();
  const type = mimeType || '';
  if (type.startsWith('video/') || ['mp4','mkv','avi','mov','webm','flv'].includes(ext)) return ICONS.video;
  if (type.startsWith('audio/') || ['mp3','wav','flac','ogg','m4a','aac'].includes(ext)) return ICONS.audio;
  if (type.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return ICONS.image;
  if (['zip','rar','7z','tar','gz','bz2','xz'].includes(ext)) return ICONS.archive;
  if (['pdf','doc','docx','txt','md','rtf'].includes(ext)) return ICONS.document;
  return ICONS.default;
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function formatTime(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds/60)}m ${Math.round(seconds%60)}s`;
  return `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}m`;
}

function extractFilename(url, disposition) {
  if (disposition) {
    const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (matches) return matches[1].replace(/['"]/g, '');
  }
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    if (filename && filename.includes('.')) return decodeURIComponent(filename);
  } catch {}
  return 'download_' + Date.now();
}

async function addDownload(url, customFilename) {
  const id = generateId();
  const download = {
    id,
    url,
    filename: customFilename || '',
    status: 'queued',
    progress: 0,
    downloaded: 0,
    total: 0,
    speed: 0,
    eta: 0,
    mimeType: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    error: null
  };

  await saveDownload(download);
  downloadQueue.push(download);
  processQueue();
  updateUI();
  showToast('info', t('addedToQueue'), download.filename || url);
  return id;
}

function processQueue() {
  const active = Array.from(activeDownloads.values()).filter(d => d.status === 'downloading').length;
  const available = Math.max(0, settings.maxConcurrent - active);
  
  for (let i = 0; i < available && downloadQueue.length > 0; i++) {
    const download = downloadQueue.shift();
    if (download.status === 'queued') startDownload(download);
  }
}

async function startDownload(download) {
  download.status = 'downloading';
  download.startTime = Date.now();
  download.speedHistory = [];
  await saveDownload(download);
  updateItemUI(download);

  const controller = new AbortController();
  const { signal } = controller;
  activeDownloads.set(download.id, { ...download, controller, paused: false });

  try {
    // Try HEAD request first to get file size and support range
    let supportsRange = false;
    let totalSize = 0;
    let mimeType = '';
    let filename = download.filename;

    try {
      const headResponse = await fetch(download.url, { method: 'HEAD', signal });
      if (headResponse.ok) {
        const contentLength = headResponse.headers.get('content-length');
        const acceptRanges = headResponse.headers.get('accept-ranges');
        const contentDisposition = headResponse.headers.get('content-disposition');
        mimeType = headResponse.headers.get('content-type') || '';
        
        if (contentLength) totalSize = parseInt(contentLength, 10);
        supportsRange = acceptRanges === 'bytes';
        
        if (!filename) filename = extractFilename(download.url, contentDisposition);
      }
    } catch (e) {
      console.warn('HEAD request failed:', e);
    }

    download.total = totalSize;
    download.mimeType = mimeType;
    if (filename) download.filename = filename;
    download.supportsRange = supportsRange;
    await saveDownload(download);
    updateItemUI(download);

    // Check for existing partial download
    let startByte = 0;
    if (supportsRange && totalSize > 0) {
      // In a real app, we'd check for partial file in filesystem
      // For now, we always start fresh due to browser limitations
    }

    const headers = {};
    if (startByte > 0) headers['Range'] = `bytes=${startByte}-`;

    const response = await fetch(download.url, { headers, signal });
    
    if (!response.ok && response.status !== 206) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!download.total && response.headers.get('content-length')) {
      download.total = parseInt(response.headers.get('content-length'), 10);
      if (startByte > 0) download.total += startByte;
    }

    const reader = response.body.getReader();
    const chunks = [];
    let downloaded = startByte;
    let lastUpdate = Date.now();
    let lastDownloaded = downloaded;

    // Use a hidden anchor to trigger download
    const blobChunks = [];
    let blobDownloaded = 0;

    while (true) {
      if (signal.aborted) throw new Error('Cancelled');
      
      const activeDl = activeDownloads.get(download.id);
      if (activeDl?.paused) {
        await waitForResume(download.id);
        continue;
      }

      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      downloaded += value.length;
      blobDownloaded += value.length;
      blobChunks.push(value);

      // Update progress every ~200ms
      const now = Date.now();
      if (now - lastUpdate >= 200) {
        const elapsed = (now - download.startTime) / 1000;
        const recentSpeed = (downloaded - lastDownloaded) / ((now - lastUpdate) / 1000);
        download.speedHistory.push(recentSpeed);
        if (download.speedHistory.length > 10) download.speedHistory.shift();
        
        download.downloaded = downloaded;
        download.progress = download.total ? Math.min(100, (downloaded / download.total) * 100) : 0;
        download.speed = download.speedHistory.reduce((a, b) => a + b, 0) / download.speedHistory.length;
        download.eta = download.speed > 0 && download.total ? (download.total - downloaded) / download.speed : 0;
        download.updatedAt = now;
        
        await saveDownload(download);
        updateItemUI(download);
        
        lastUpdate = now;
        lastDownloaded = downloaded;
      }
    }

    // Create blob and trigger download
    const blob = new Blob(blobChunks, { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = download.filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    download.status = 'complete';
    download.progress = 100;
    download.downloaded = download.total || downloaded;
    download.updatedAt = Date.now();
    await saveDownload(download);
    updateItemUI(download);
    activeDownloads.delete(download.id);

    showToast('success', t('downloadComplete'), download.filename);
    if (settings.notifications) showNotification(t('downloadComplete'), download.filename);
    if (settings.autoOpen && 'launchQueue' in window) {
      // File Handling API would go here
    }

    processQueue();
    updateWakeLock();

  } catch (error) {
    if (error.name === 'AbortError' || error.message === 'Cancelled') {
      download.status = 'paused';
    } else {
      download.status = 'error';
      download.error = error.message;
      showToast('error', 'Download failed', error.message);
    }
    download.updatedAt = Date.now();
    await saveDownload(download);
    updateItemUI(download);
    activeDownloads.delete(download.id);
    processQueue();
    updateWakeLock();
  }
}

function waitForResume(id) {
  return new Promise(resolve => {
    const check = setInterval(() => {
      const dl = activeDownloads.get(id);
      if (!dl || !dl.paused) {
        clearInterval(check);
        resolve();
      }
    }, 500);
  });
}

function pauseDownload(id) {
  const dl = activeDownloads.get(id);
  if (dl && dl.status === 'downloading') {
    dl.paused = true;
    dl.status = 'paused';
    saveDownload(dl);
    updateItemUI(dl);
    updateWakeLock();
  }
}

function resumeDownload(id) {
  const dl = activeDownloads.get(id);
  if (dl && dl.paused) {
    dl.paused = false;
    dl.status = 'downloading';
    saveDownload(dl);
    updateItemUI(dl);
    updateWakeLock();
  }
}

function cancelDownload(id) {
  const dl = activeDownloads.get(id);
  if (dl) {
    dl.controller.abort();
    activeDownloads.delete(id);
  }
  // Remove from queue if queued
  const queueIndex = downloadQueue.findIndex(d => d.id === id);
  if (queueIndex !== -1) downloadQueue.splice(queueIndex, 1);
  
  deleteDownload(id);
  removeItemElement(document.querySelector(`[data-id="${id}"]`));
  updateUI();
  updateWakeLock();
}

function retryDownload(download) {
  download.status = 'queued';
  download.error = null;
  download.progress = 0;
  download.downloaded = 0;
  download.speed = 0;
  download.eta = 0;
  download.updatedAt = Date.now();
  saveDownload(download);
  downloadQueue.push(download);
  processQueue();
  updateItemUI(download);
}

// UI Updates
function createItemElement(download) {
  const item = document.createElement('div');
  item.className = 'download-item';
  item.dataset.id = download.id;
  item.dataset.status = download.status;
  item.innerHTML = buildItemHTML(download);
  downloadsList.appendChild(item);
  return item;
}

function buildItemHTML(download) {
  const icon = getFileIcon(download.filename, download.mimeType);
  const statusClass = `status-${download.status}`;
  const statusText = t(download.status);
  const progressWidth = download.status === 'complete' ? 100 : download.progress;
  const progressClass = download.status === 'paused' ? 'paused' : download.status === 'error' ? 'error' : download.status === 'complete' ? 'complete' : '';
  const showProgress = ['downloading', 'paused', 'complete'].includes(download.status);
  const showActions = !['complete', 'error'].includes(download.status) || download.status === 'error';
  
  let metaHTML = '';
  if (download.total) {
    metaHTML += `<span>${formatBytes(download.downloaded)} / ${formatBytes(download.total)}</span>`;
  } else if (download.downloaded) {
    metaHTML += `<span>${formatBytes(download.downloaded)}</span>`;
  }
  if (download.speed > 0) {
    metaHTML += `<span class="speed-eta">${formatBytes(download.speed)}/s</span>`;
  }
  if (download.eta > 0 && download.status === 'downloading') {
    metaHTML += `<span class="speed-eta">ETA: ${formatTime(download.eta)}</span>`;
  }

  let actionsHTML = '';
  if (showActions) {
    if (download.status === 'downloading') {
      actionsHTML = `
        <button class="btn btn-secondary pause-btn" data-action="pause">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ${t('pause')}
        </button>
        <button class="btn btn-secondary cancel-btn" data-action="cancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ${t('cancel')}
        </button>
      `;
    } else if (download.status === 'paused') {
      actionsHTML = `
        <button class="btn btn-primary resume-btn" data-action="resume">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          ${t('resume')}
        </button>
        <button class="btn btn-secondary cancel-btn" data-action="cancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ${t('cancel')}
        </button>
      `;
    } else if (download.status === 'error') {
      actionsHTML = `
        <button class="btn btn-primary retry-btn" data-action="retry">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          ${t('retry')}
        </button>
        <button class="btn btn-secondary remove-btn" data-action="remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          ${t('remove')}
        </button>
      `;
    } else if (download.status === 'complete') {
      actionsHTML = `
        <button class="btn btn-secondary open-btn" data-action="open">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          ${t('open')}
        </button>
        <button class="btn btn-secondary remove-btn" data-action="remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          ${t('remove')}
        </button>
      `;
    } else { // queued
      actionsHTML = `
        <button class="btn btn-secondary cancel-btn" data-action="cancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ${t('cancel')}
        </button>
      `;
    }
  }

  return `
    <div class="item-header">
      <div class="item-icon">${icon}</div>
      <div class="item-info">
        <div class="item-filename" title="${download.filename}">${download.filename}</div>
        <div class="item-meta">${metaHTML}</div>
      </div>
      <div class="item-status">
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
    </div>
    ${showProgress ? `
      <div class="progress-bar">
        <div class="progress-fill ${progressClass}" style="width: ${progressWidth}%"></div>
      </div>
    ` : ''}
    ${actionsHTML ? `
      <div class="item-actions">
        ${actionsHTML}
      </div>
    ` : ''}
  `;
}

function updateItemUI(download) {
  let item = document.querySelector(`[data-id="${download.id}"]`);
  if (!item) {
    item = createItemElement(download);
    attachItemListeners(item);
  } else {
    item.dataset.status = download.status;
    item.innerHTML = buildItemHTML(download);
    attachItemListeners(item);
  }
  updateUI();
}

function removeItemElement(item) {
  if (!item) return;
  item.classList.add('removing');
  setTimeout(() => item.remove(), 200);
}

function attachItemListeners(item) {
  item.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = item.dataset.id;
      const download = activeDownloads.get(id) || downloadQueue.find(d => d.id === id);
      
      switch (action) {
        case 'pause': pauseDownload(id); break;
        case 'resume': resumeDownload(id); break;
        case 'cancel': cancelDownload(id); break;
        case 'remove': cancelDownload(id); break;
        case 'retry': retryDownload(download); break;
        case 'open': openFile(download); break;
      }
    });
  });
}

function openFile(download) {
  // In a real app, we'd use File System Access API or launchQueue
  // For now, just show toast
  showToast('info', t('open'), t('openFileMsg'));
}

function restoreDownload(download) {
  if (['downloading', 'paused', 'queued'].includes(download.status)) {
    download.status = 'queued';
    download.progress = 0;
    download.downloaded = 0;
    download.speed = 0;
    download.eta = 0;
    download.error = null;
    downloadQueue.push(download);
  }
  createItemElement(download);
  attachItemListeners(document.querySelector(`[data-id="${download.id}"]`));
}

function updateUI() {
  const items = downloadsList.querySelectorAll('.download-item');
  const hasItems = items.length > 0;
  emptyState.style.display = hasItems ? 'none' : 'block';
  
  const active = Array.from(activeDownloads.values()).filter(d => d.status === 'downloading').length;
  const queued = downloadQueue.length;
  const total = active + queued;
  downloadCount.textContent = total > 0 ? `${total} (${active} active)` : '0';
}

function showToast(type, title, message) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  toast.innerHTML = `
    ${icons[type]}
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

async function showNotification(title, body) {
  if (!settings.notifications || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'download' });
  }
}

async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

async function updateWakeLock() {
  if (!settings.wakeLock) {
    if (wakeLock) { await wakeLock.release(); wakeLock = null; }
    return;
  }
  const hasActive = Array.from(activeDownloads.values()).some(d => d.status === 'downloading');
  if (hasActive && !wakeLock && 'wakeLock' in navigator) {
    try { wakeLock = await navigator.wakeLock.request('screen'); }
    catch (e) { console.warn('Wake lock failed:', e); }
  } else if (!hasActive && wakeLock) {
    await wakeLock.release();
    wakeLock = null;
  }
}

// Settings
function loadSettings() {
  const stored = localStorage.getItem('downloader_settings');
  if (stored) {
    settings = { ...settings, ...JSON.parse(stored) };
    autoOpenToggle.checked = settings.autoOpen;
    concurrentSelect.value = settings.maxConcurrent;
    notifyToggle.checked = settings.notifications;
    wakeLockToggle.checked = settings.wakeLock;
  }
  applyLanguage();
}

function saveSettings() {
  localStorage.setItem('downloader_settings', JSON.stringify(settings));
}

function applyLanguage() {
  const isRTL = settings.language === 'ar';
  document.documentElement.lang = settings.language;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  langBtn.textContent = isRTL ? 'EN' : 'عربي';
  
  // Update static text elements
  if (downloadsTitle) downloadsTitle.textContent = t('downloads');
  if (emptyState) {
    emptyState.querySelector('h3').textContent = t('noDownloads');
    emptyState.querySelector('p').textContent = t('addUrl');
  }
  if (urlInput) {
    urlInput.placeholder = 'https://example.com/file.zip';
    urlInput.parentElement.querySelector('label').textContent = t('downloadUrl');
  }
  if (filenameInput) {
    filenameInput.placeholder = t('autoDetect');
    filenameInput.parentElement.querySelector('label').textContent = t('filename');
  }
  const submitBtn = addForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.innerHTML = submitBtn.innerHTML.replace(/>.*</, `>${t('startDownload')}<`);
  
  if (mediaVideoBtn) mediaVideoBtn.querySelector('span').textContent = t('mediaVideo');
  if (mediaAudioBtn) mediaAudioBtn.querySelector('span').textContent = t('mediaAudio');
  if (openInCobaltBtn) {
    const svg = openInCobaltBtn.querySelector('svg');
    openInCobaltBtn.textContent = '';
    if (svg) openInCobaltBtn.appendChild(svg);
    openInCobaltBtn.appendChild(document.createTextNode(t('openExternal')));
  }
  updateMediaPanel();
  
  // Settings modal
  const settingsTitle = document.getElementById('settingsTitle');
  if (settingsTitle) settingsTitle.textContent = t('settings');
  const labels = document.querySelectorAll('.setting-label-text');
  const descs = document.querySelectorAll('.setting-label-desc');
  if (labels[0]) labels[0].textContent = t('autoOpen');
  if (descs[0]) descs[0].textContent = t('autoOpenDesc');
  if (labels[1]) labels[1].textContent = t('concurrent');
  if (descs[1]) descs[1].textContent = t('concurrentDesc');
  if (labels[2]) labels[2].textContent = t('notifications');
  if (descs[2]) descs[2].textContent = t('notificationsDesc');
  if (labels[3]) labels[3].textContent = t('wakeLock');
  if (descs[3]) descs[3].textContent = t('wakeLockDesc');
  if (labels[4]) labels[4].textContent = t('clearHistory');
  if (descs[4]) descs[4].textContent = t('clearHistoryDesc');
  if (clearHistoryBtn) clearHistoryBtn.textContent = t('clearHistory');
  
  // Concurrent select options
  if (concurrentSelect) {
    const options = concurrentSelect.options;
    if (options[0]) options[0].textContent = t('oneAtTime');
    if (options[1]) options[1].textContent = t('twoAtTime');
    if (options[2]) options[2].textContent = t('threeAtTime');
    if (options[3]) options[3].textContent = t('fourAtTime');
  }
  
  // Install banner
  const installInfo = installBanner.querySelector('.install-info');
  if (installInfo) {
    installInfo.querySelector('h4').textContent = t('installApp');
    installInfo.querySelector('p').textContent = t('installDesc');
  }
  if (installBtn) installBtn.textContent = t('installBtn');
  
  // Update status badges for existing items
  document.querySelectorAll('.download-item').forEach(item => {
    const badge = item.querySelector('.status-badge');
    if (badge) {
      const status = item.dataset.status;
      badge.textContent = t(status);
    }
    // Update action buttons
    item.querySelectorAll('[data-action]').forEach(btn => {
      const action = btn.dataset.action;
      const span = btn.querySelector('svg') ? btn.childNodes[btn.childNodes.length - 1] : null;
      if (span && span.nodeType === Node.TEXT_NODE) {
        span.textContent = ' ' + t(action);
      }
    });
  });
}

function applySettings() {
  settings.maxConcurrent = parseInt(concurrentSelect.value, 10);
  processQueue();
  updateWakeLock();
}

// Media panel & engine integration
function updateMediaPanel() {
  if (!mediaPanel || !urlInput) return;
  const url = urlInput.value.trim();
  const media = url && isMediaUrl(url);
  mediaPanel.style.display = media ? 'flex' : 'none';
  if (media && mediaPlatform) {
    mediaPlatform.textContent = `${t('platform_' + platformKey(url))} — ${t('mediaDetected')}`;
  }
}

async function startMediaDownload(mode) {
  const url = urlInput.value.trim();
  if (!url || !isMediaUrl(url)) return;

  mediaVideoBtn.disabled = true;
  mediaAudioBtn.disabled = true;
  showToast('info', t('resolving'), url);

  const res = await resolveMedia(url, mode);

  mediaVideoBtn.disabled = false;
  mediaAudioBtn.disabled = false;

  if (!res.ok) {
    showToast('error', t('mediaFail'), t('mediaFailHint'));
    return;
  }

  if (res.picker && res.picker.length) {
    // Carousel / multiple items (e.g. Instagram posts)
    res.picker.forEach((item, i) => {
      const name = (res.filename || 'media') + (res.picker.length > 1 ? ` (${i + 1})` : '');
      addDownload(item.url, name);
    });
    if (res.audio) addDownload(res.audio, (res.filename || 'audio') + '.mp3');
    showToast('success', t('mediaReady'), `${res.picker.length} ×`);
  } else if (res.url) {
    addDownload(res.url, res.filename || undefined);
    showToast('success', t('mediaReady'), res.filename || url);
  } else {
    showToast('error', t('mediaFail'), t('mediaFailHint'));
    return;
  }

  urlInput.value = '';
  updateMediaPanel();
}

// Event Listeners
function setupEventListeners() {
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;
    const filename = filenameInput.value.trim() || undefined;
    addDownload(url, filename);
    urlInput.value = '';
    filenameInput.value = '';
    urlInput.focus();
  });

  // Social media URL detection
  urlInput.addEventListener('input', updateMediaPanel);

  // Media download buttons
  mediaVideoBtn.addEventListener('click', () => startMediaDownload('auto'));
  mediaAudioBtn.addEventListener('click', () => startMediaDownload('audio'));

  // Open in Cobalt externally (fallback)
  openInCobaltBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) {
      window.open(`https://cobalt.tools/?url=${encodeURIComponent(url)}`, '_blank');
      showToast('info', t('openExternal'), url);
    }
  });

  // Language toggle
  langBtn.addEventListener('click', () => {
    settings.language = settings.language === 'ar' ? 'en' : 'ar';
    saveSettings();
    applyLanguage();
  });

  settingsBtn.addEventListener('click', () => settingsModal.classList.add('open'));
  closeSettings.addEventListener('click', () => settingsModal.classList.remove('open'));
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove('open');
  });

  autoOpenToggle.addEventListener('change', () => { settings.autoOpen = autoOpenToggle.checked; saveSettings(); });
  concurrentSelect.addEventListener('change', () => { applySettings(); saveSettings(); });
  notifyToggle.addEventListener('change', () => { settings.notifications = notifyToggle.checked; saveSettings(); requestNotificationPermission(); });
  wakeLockToggle.addEventListener('change', () => { settings.wakeLock = wakeLockToggle.checked; saveSettings(); updateWakeLock(); });

  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm(t('clearConfirm'))) {
      await clearCompletedDownloads();
      settingsModal.classList.remove('open');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') settingsModal.classList.remove('open');
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); urlInput.focus(); }
  });

  // Paste URL from clipboard
  document.addEventListener('paste', async (e) => {
    if (document.activeElement === urlInput) return;
    const text = e.clipboardData.getData('text').trim();
    if (text.match(/^https?:\/\//)) {
      urlInput.value = text;
      updateMediaPanel();
      filenameInput.focus();
    }
  });
}

// Service Worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      console.log('SW registered:', reg.scope);
    } catch (e) {
      console.warn('SW registration failed:', e);
    }
  }
}

// Install Prompt
function checkInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show after a delay
    setTimeout(() => installBanner.classList.remove('hidden'), 5000);
  });

  window.addEventListener('appinstalled', () => {
    installBanner.classList.add('hidden');
    deferredPrompt = null;
    showToast('success', t('installed'), t('addedToHome'));
  });

  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBanner.classList.add('hidden');
      }
      deferredPrompt = null;
    }
  });

  // Hide if already in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    installBanner.classList.add('hidden');
  }
}

// Initialize
init();