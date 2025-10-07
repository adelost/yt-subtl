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

    const errors = [];

    for (const { fmt } of formats) {
      try {
        const url = new URL(this.track.baseUrl);
        if (fmt) url.searchParams.set('fmt', fmt);

        const resp = await fetchCaption(url.toString());

        if (!resp.ok) {
          errors.push(`${fmt || 'default'}: ${resp.error} (${resp.details || 'no details'})`);
          continue;
        }

        const text = parseTranscript(resp.body, resp.contentType || '', withTS);
        if (text?.trim()) return text;

        errors.push(`${fmt || 'default'}: Empty or unparseable response`);
      } catch (err) {
        errors.push(`${fmt || 'default'}: ${err.message}`);
      }
    }

    // Create detailed error message
    const errorMsg = `All formats failed:\n${errors.join('\n')}`;
    const error = new Error(errorMsg);
    error.details = errors;
    throw error;
  }
}
