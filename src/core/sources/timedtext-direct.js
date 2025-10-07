import { fetchCaption } from '../../lib/utils.js';
import { parseTranscript } from '../../lib/parsers.js';
import { reportStatus } from '../../shared/status-bus.js';

const buildFallbackUrl = (track, videoId, fmt) => {
  try {
    const t = track || {}; if (!videoId) return null;
    let lang = t.languageCode || null; let kind = t.kind || null;
    const vss = t.vssId || t.vss_id || null;
    if (!lang && typeof vss === 'string') {
      if (vss.startsWith('a.')) { lang = vss.slice(2); kind = 'asr'; }
      else if (vss.startsWith('.')) { lang = vss.slice(1); }
    }
    if (!lang) return null;
    const params = new URLSearchParams();
    params.set('v', videoId);
    params.set('lang', lang);
    if (kind === 'asr') { params.set('caps', 'asr'); params.set('kind', 'asr'); }
    const name = t?.name?.simpleText || (Array.isArray(t?.name?.runs) ? t.name.runs.map(r => r.text).join('') : null);
    if (name && kind !== 'asr') params.set('name', name);
    if (fmt) params.set('fmt', fmt);
    const uiLang = (navigator.language || 'en').replace('_', '-'); params.set('hl', uiLang);
    return `https://www.youtube.com/api/timedtext?${params.toString()}`;
  } catch { return null; }
};

export const tryTimedtextDirect = async (track, videoId, withTS) => {
  const formats = [ { label:'raw', fmt:null }, { label:'json3', fmt:'json3' }, { label:'srv3', fmt:'srv3' }, { label:'vtt', fmt:'vtt' } ];
  for (const { label, fmt } of formats) {
    try {
      let urlStr = track.baseUrl;
      if (fmt) {
        const hasFmt = /([?&])fmt=/.test(urlStr);
        if (hasFmt) urlStr = urlStr.replace(/([?&])fmt=[^&#]*/g, `$1fmt=${encodeURIComponent(fmt)}`);
        else urlStr = urlStr + (urlStr.includes('?') ? '&' : '?') + `fmt=${encodeURIComponent(fmt)}`;
        if (fmt === 'srv3') {
          for (const kv of ['xorb=2','xobt=3','xovt=3']) {
            const [k] = kv.split('='); if (!new RegExp(`([?&])${k}=`).test(urlStr)) urlStr = urlStr + (urlStr.includes('?') ? '&' : '?') + kv;
          }
        }
      }
      const candidates = [urlStr];
      const fb = buildFallbackUrl(track, videoId, fmt || (label==='raw'?null:undefined));
      if (fb) candidates.push(fb);

      for (const c of candidates) {
        reportStatus(`Trying ${label}${c!==urlStr?' (fallback)':''}…`);
        const resp = await fetchCaption(c);
        if (!resp?.ok) continue;
        const text = parseTranscript(resp.body, resp.contentType||'', withTS);
        if (text?.trim()) return { ok: true, text, via: `timedtext:${label}${c!==urlStr?'-fb':''}` };
      }
    } catch {}
  }
  return { ok: false };
};

