// Transcript fetching logic

import { fetchCaption, fetchYTTranscript } from './utils.js';
import { awaitTemplateForTrack } from './harvest.js';
import { parseTranscript, parseYouTubeITranscript } from './parsers.js';
const reportStatus = (msg) => { try { window.dispatchEvent(new CustomEvent('ytxt:status', { detail: msg })); } catch {} };

export class TranscriptFetcher {
  constructor(track, videoId = null) {
    this.track = track;
    this.videoId = videoId;
  }

  buildFallbackUrl(fmt) {
    try {
      const v = this.videoId;
      const t = this.track || {};
      if (!v) return null;
      // Derive language and kind from track
      let lang = t.languageCode || null;
      let kind = t.kind || null;
      const vss = t.vssId || t.vss_id || null;
      if (!lang && typeof vss === 'string') {
        if (vss.startsWith('a.')) { lang = vss.slice(2); kind = 'asr'; }
        else if (vss.startsWith('.')) { lang = vss.slice(1); }
      }
      if (!lang) return null;

      const params = new URLSearchParams();
      params.set('v', v);
      params.set('lang', lang);
      if (kind === 'asr') {
        // Prefer caps=asr (observed in baseUrl), keep kind for compatibility
        params.set('caps', 'asr');
        params.set('kind', 'asr');
      }
      // If manual track has a specific name, include it
      const name = t?.name?.simpleText || (Array.isArray(t?.name?.runs) ? t.name.runs.map(r => r.text).join('') : null);
      if (name && kind !== 'asr') params.set('name', name);
      if (fmt) params.set('fmt', fmt);
      // UI language hint (mirrors requests YouTube itself makes)
      const uiLang = (navigator.language || 'en').replace('_', '-');
      params.set('hl', uiLang);

      return `https://www.youtube.com/api/timedtext?${params.toString()}`;
    } catch (_) {
      return null;
    }
  }

  async fetch(withTS) {
    // First, see if we can harvest a working template from the page itself
    try {
      const harvested = await awaitTemplateForTrack(this.videoId, this.track, 2200);
      if (harvested?.kind === 'youtubei' && harvested.data?.params) {
        console.log('[ytxt] Using harvested YouTubeI params');
        reportStatus('Using harvested YouTubeI params…');
        const yti = await fetchYTTranscript(harvested.data.params);
        if (yti.ok) {
          const text = parseYouTubeITranscript(yti.json, withTS);
          if (text?.trim()) return text;
        }
      } else if (harvested?.kind === 'timedtext' && harvested.data?.body) {
        console.log('[ytxt] Using harvested timedtext response');
        reportStatus('Using harvested timedtext response…');
        const ct = harvested.data.contentType || '';
        const text = parseTranscript(harvested.data.body, ct, withTS);
        if (text?.trim()) return text;
      }
    } catch (e) {
      // Non-fatal; continue with other fallbacks
    }
    // Try YouTubeI get_transcript first if params are present
    if (this.track && this.track.params) {
      try {
        console.log('[ytxt] Trying YouTubeI get_transcript with params');
        reportStatus('Trying YouTubeI (track params)…');
        const yti = await fetchYTTranscript(this.track.params);
        if (yti.ok) {
          const text = parseYouTubeITranscript(yti.json, withTS);
          if (text?.trim()) { reportStatus('Loaded via YouTubeI'); return text; }
        }
      } catch (e) {
        // continue to timedtext
      }
    }

    const formats = [
      { label: 'raw', fmt: null },
      { label: 'json3', fmt: 'json3' },
      { label: 'srv3', fmt: 'srv3' },
      { label: 'vtt', fmt: 'vtt' }
    ];

    const errors = [];

    for (const { fmt, label } of formats) {
      try {
        // Avoid re-parsing signed/opaque URLs; start from the exact baseUrl
        let urlStr = this.track.baseUrl;
        if (fmt) {
          const hasFmt = /([?&])fmt=/.test(urlStr);
          if (hasFmt) {
            urlStr = urlStr.replace(/([?&])fmt=[^&#]*/g, `$1fmt=${encodeURIComponent(fmt)}`);
          } else {
            urlStr = urlStr + (urlStr.includes('?') ? '&' : '?') + `fmt=${encodeURIComponent(fmt)}`;
          }
          if (fmt === 'srv3') {
            const extra = ['xorb=2', 'xobt=3', 'xovt=3'];
            for (const kv of extra) {
              const [k] = kv.split('=');
              if (!new RegExp(`([?&])${k}=`).test(urlStr)) {
                urlStr = urlStr + (urlStr.includes('?') ? '&' : '?') + kv;
              }
            }
          }
        }

        // Prepare candidate URLs: primary is baseUrl (raw or fmt-modified), then fallback
        const candidates = [urlStr];
        const fb = this.buildFallbackUrl(fmt || (label === 'raw' ? null : undefined));
        if (fb) candidates.push(fb);

        let lastError = null;
        for (const candidate of candidates) {
          // Debug: show exactly what we are about to fetch
          console.log('[ytxt] Fetching caption', { fmt: label, url: candidate });
          reportStatus(`Trying ${label}${candidate !== urlStr ? ' (fallback)' : ''}…`);
          const resp = await fetchCaption(candidate);

          if (!resp.ok) {
            lastError = `${label}: ${resp.error} (${resp.details || 'no details'})`;
            // Try next candidate
            continue;
          }

          const text = parseTranscript(resp.body, resp.contentType || '', withTS);
          if (text?.trim()) { reportStatus(`Loaded via ${label}${candidate !== urlStr ? ' (fallback)' : ''}`); return text; }

          lastError = `${label}: Empty or unparseable response`;
          // Try next candidate
        }
        if (lastError) errors.push(lastError);
      } catch (err) {
        errors.push(`${label}: ${err.message}`);
      }
    }

    // Create detailed error message
    const errorMsg = `All formats failed:\n${errors.join('\n')}`;
    const error = new Error(errorMsg);
    error.details = errors;
    throw error;
  }
}
