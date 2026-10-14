import { reportStatus } from '../shared/status-bus.js';
import { tryPlayerCaptions } from './sources/player-captions.js';
import { tryPageData } from './sources/page-data.js';

const DEFAULT_FAILURE = 'Could not load this caption track. Try another language or reload YouTube.';

/** WHAT: Fetches captions for one selected track. WHY: Keeps source retries out of UI actions. */
export const fetchTranscript = async (track, videoId, withTS) => {
  // The player covers every track; the page transcript only the default one.
  const steps = [
    { name: 'YouTube player', fn: tryPlayerCaptions },
    { name: 'Page transcript', fn: tryPageData },
  ];

  let reason = '';
  for (const step of steps) {
    try {
      const res = await step.fn(track, videoId, withTS);
      if (res?.ok && res.text?.trim()) {
        reportStatus(`Loaded via ${res.via || step.name}`);
        window.dispatchEvent(new CustomEvent('ytxt:debug', { detail: { via: res.via || step.name } }));
        return res.text;
      }
      reason ||= res?.reason || '';
    } catch (error) {
      console.warn(`[YouTube Transcript Reader] ${step.name} failed`, error);
    }
  }
  throw new Error(reason || DEFAULT_FAILURE);
};
