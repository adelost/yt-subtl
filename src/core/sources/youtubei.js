import { fetchYTTranscript } from '../../lib/api.js';
import { parseYouTubeITranscript } from '../../lib/parsers.js';
import { reportStatus } from '../../shared/status-bus.js';

export const tryYouTubeI = async (track, videoId, withTS) => {
  try {
    // Fallback: track-provided params (if present)
    if (track?.params) {
      reportStatus('Trying YouTubeI (track params)…');
      const resp = await fetchYTTranscript(track.params);
      if (resp?.ok) {
        const text = parseYouTubeITranscript(resp.json, withTS);
        if (text?.trim()) return { ok: true, text, via: 'youtubei:track-params', meta: { endpoint: 'youtubei', contentType: resp.contentType || 'application/json' } };
      }
    }
  } catch {}
  return { ok: false };
};
