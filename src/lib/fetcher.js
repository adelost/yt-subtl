// Transcript fetching logic

import { fetchCaption } from './utils.js';
import { parseTranscript } from './parsers.js';

export class TranscriptFetcher {
  constructor(track) {
    this.track = track;
  }

  async fetch(withTS) {
    const formats = [
      { fmt: 'json3', type: 'application/json' },
      { fmt: 'vtt', type: 'text' },
      { fmt: null, type: null }
    ];

    for (const { fmt } of formats) {
      try {
        const url = new URL(this.track.baseUrl);
        if (fmt) url.searchParams.set('fmt', fmt);

        const resp = await fetchCaption(url.toString());
        const text = parseTranscript(resp.body, resp.contentType || '', withTS);
        if (text?.trim()) return text;
      } catch (err) {
        console.warn(`Format ${fmt} failed:`, err);
      }
    }
    throw new Error('All formats failed');
  }
}
