import { awaitTemplateForTrack } from '../../lib/harvest.js';
import { parseTranscript } from '../../lib/parsers.js';
import { reportStatus } from '../../shared/status-bus.js';

export const tryTimedtextHarvest = async (track, videoId, withTS) => {
  try {
    const harvested = await awaitTemplateForTrack(videoId, track, 1800);
    if (harvested?.kind === 'timedtext' && harvested.data?.body) {
      reportStatus('Using harvested timedtext response…');
      const ct = harvested.data.contentType || '';
      const text = parseTranscript(harvested.data.body, ct, withTS);
      if (text?.trim()) return { ok: true, text, via: 'timedtext:harvest' };
    }
  } catch {}
  return { ok: false };
};

