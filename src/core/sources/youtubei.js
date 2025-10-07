import { awaitTemplateForTrack } from '../../lib/harvest.js';
import { fetchYTTranscript } from '../../lib/utils.js';
import { parseYouTubeITranscript } from '../../lib/parsers.js';
import { reportStatus } from '../../shared/status-bus.js';

export const tryYouTubeI = async (track, videoId, withTS) => {
  try {
    // Prefer harvested params first
    const harvested = await awaitTemplateForTrack(videoId, track, 1800);
    if (harvested?.kind === 'youtubei' && harvested.data?.params) {
      reportStatus('Using harvested YouTubeI params…');
      const resp = await fetchYTTranscript(harvested.data.params);
      if (resp?.ok) {
        const text = parseYouTubeITranscript(resp.json, withTS);
        if (text?.trim()) return { ok: true, text, via: 'youtubei:harvest' };
      }
    }
  } catch {}

  try {
    // Fallback: track-provided params (if present)
    if (track?.params) {
      reportStatus('Trying YouTubeI (track params)…');
      const resp = await fetchYTTranscript(track.params);
      if (resp?.ok) {
        const text = parseYouTubeITranscript(resp.json, withTS);
        if (text?.trim()) return { ok: true, text, via: 'youtubei:track-params' };
      }
    }
  } catch {}
  return { ok: false };
};

