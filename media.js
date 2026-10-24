// Media Engine - resolves social media URLs (YouTube, TikTok, Instagram...) into
// direct downloadable files via public Cobalt API instances. 100% client-side.

// Public instances with CORS enabled and no auth required (verified working).
// Ordered by reliability; the app falls back through the list automatically.
export const MEDIA_ENGINES = [
  'https://rue-cobalt.xenon.zone/',
  'https://cobaltapi.cjs.nz/'
];

const REQUEST_TIMEOUT = 25000; // ms per engine attempt

const MEDIA_HOSTS = new RegExp(
  '(?:^|\\.)(youtube\\.com|youtu\\.be|youtube-nocookie\\.com|music\\.youtube\\.com' +
  '|tiktok\\.com|vt\\.tiktok\\.com|vm\\.tiktok\\.com' +
  '|instagram\\.com|instagr\\.am|ig\\.me' +
  '|twitter\\.com|x\\.com' +
  '|facebook\\.com|fb\\.watch|fb\\.com|m\\.facebook\\.com' +
  '|soundcloud\\.com|on\\.soundcloud\\.com' +
  '|vk\\.com|vkvideo\\.ru' +
  '|dailymotion\\.com|dai\\.ly' +
  '|twitch\\.tv|clips\\.twitch\\.tv' +
  '|pinterest\\.com|pin\\.it' +
  '|tumblr\\.com' +
  '|bilibili\\.com|b23\\.tv' +
  '|rutube\\.ru' +
  '|ok\\.ru' +
  '|bsky\\.app' +
  '|loom\\.com)$',
  'i'
);

export function isMediaUrl(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    return MEDIA_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

export function platformKey(url) {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (h.includes('youtu')) return 'youtube';
    if (h.includes('tiktok')) return 'tiktok';
    if (h.includes('instagr')) return 'instagram';
    if (h === 'x.com' || h.includes('twitter')) return 'twitter';
    if (h.includes('facebook') || h.includes('fb.')) return 'facebook';
    if (h.includes('soundcloud')) return 'soundcloud';
    if (h.includes('vk.')) return 'vk';
    if (h.includes('dailymotion') || h === 'dai.ly') return 'dailymotion';
    if (h.includes('twitch')) return 'twitch';
    if (h.includes('pinterest') || h === 'pin.it') return 'pinterest';
    if (h.includes('tumblr')) return 'tumblr';
    if (h.includes('bilibili') || h === 'b23.tv') return 'bilibili';
    if (h.includes('rutube')) return 'rutube';
    if (h.includes('bsky')) return 'bluesky';
    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Resolve a media URL into a direct download URL.
 * mode: 'auto' (video+audio best mp4) | 'audio' (mp3)
 * Returns:
 *  { ok:true, url, filename }                     - single media ready to download
 *  { ok:true, picker:[{url,type}], audio, filename } - carousel/multiple items
 *  { ok:false, errors:[] }                        - all engines failed
 */
export async function resolveMedia(url, mode = 'auto') {
  const body = {
    url,
    downloadMode: mode,
    videoQuality: '1080',
    youtubeVideoCodec: 'h264',
    audioFormat: 'mp3'
  };

  const errors = [];
  for (const base of MEDIA_ENGINES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) {
        errors.push(`${base} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();

      if (data.status === 'tunnel' || data.status === 'redirect') {
        return { ok: true, url: data.url, filename: data.filename || '' };
      }

      if (data.status === 'picker' && Array.isArray(data.picker) && data.picker.length) {
        return {
          ok: true,
          picker: data.picker,
          audio: data.audio || null,
          filename: data.filename || ''
        };
      }

      errors.push(`${base} ${data.error?.code || 'unknown'}`);
    } catch (e) {
      clearTimeout(timer);
      errors.push(`${base} ${e.name === 'AbortError' ? 'timeout' : (e.message || 'network')}`);
    }
  }

  return { ok: false, errors };
}
