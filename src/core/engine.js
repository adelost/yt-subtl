import { reportStatus } from '../shared/status-bus.js';
import { tryYouTubeI } from './sources/youtubei.js';
import { tryDomPanel } from './sources/dom-panel.js';
import { tryTimedtextHarvest } from './sources/timedtext-harvest.js';
import { tryTimedtextDirect } from './sources/timedtext-direct.js';

export const fetchTranscript = async (track, videoId, withTS) => {
  // Strategy order: YouTubeI → DOM panel → harvested timedtext → direct timedtext
  const steps = [
    { name: 'YouTubeI', fn: tryYouTubeI },
    { name: 'DOM panel', fn: tryDomPanel },
    { name: 'Timedtext (harvest)', fn: tryTimedtextHarvest },
    { name: 'Timedtext (direct)', fn: tryTimedtextDirect }
  ];

  for (const step of steps) {
    try {
      const res = await step.fn(track, videoId, withTS);
      if (res?.ok && res.text?.trim()) {
        reportStatus(`Loaded via ${res.via || step.name}`);
        return res.text;
      }
    } catch {}
  }
  throw new Error('Transcript not available via YouTubeI, panel, or timedtext');
};

