import { reportStatus } from '../shared/status-bus.js';
import { tryPageData } from './sources/page-data.js';
import { tryYouTubeI } from './sources/youtubei.js';
import { tryDomPanel } from './sources/dom-panel.js';
import { tryTimedtextHarvest } from './sources/timedtext-harvest.js';
import { tryTimedtextDirect } from './sources/timedtext-direct.js';

/** WHAT: Fetches captions for one selected track. WHY: Keeps source retries out of UI actions. */
export const fetchTranscript = async (track, videoId, withTS) => {
  // Track-bound sources first; an open DOM panel may be on another language.
  const steps = [
    { name: 'Page transcript', fn: tryPageData },
    { name: 'YouTubeI', fn: tryYouTubeI },
    { name: 'Timedtext (harvest)', fn: tryTimedtextHarvest },
    { name: 'Timedtext (direct)', fn: tryTimedtextDirect },
    { name: 'DOM panel', fn: tryDomPanel }
  ];

  for (const step of steps) {
    try {
      const res = await step.fn(track, videoId, withTS);
      if (res?.ok && res.text?.trim()) {
        reportStatus(`Loaded via ${res.via || step.name}`);
        try {
          const meta = res.meta || {};
          window.dispatchEvent(new CustomEvent('ytxt:debug', { detail: { via: res.via || step.name, meta } }));
        } catch {}
        return res.text;
      }
    } catch {}
  }
  throw new Error('Could not load this caption track. Try another language or reload YouTube.');
};
