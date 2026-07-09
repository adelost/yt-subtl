// Transcript format parsers

import { msToTimestamp } from './helpers.js';

const decodeEntities = (text) => String(text || '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'");

export const normalizeCaptionText = (text) => decodeEntities(text)
  .replace(/<[^>]*>/g, '')
  .replace(/\s*\n+\s*/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const json3ToText = (json, withTS) => {
  if (!json?.events) return '';
  return json.events
    .filter(ev => ev?.segs)
    .map(ev => {
      const text = normalizeCaptionText(ev.segs.map(s => s.utf8 || '').join(''));
      return text && (withTS ? `[${msToTimestamp(ev.tStartMs || 0)}] ${text}` : text);
    })
    .filter(Boolean)
    .join('\n');
};

export const vttToText = (vtt, withTS) => {
  const lines = vtt.split(/\r?\n/);
  const out = [];
  let bucket = [], ts = null;
  const timeRe = /(\d{2}:)?\d{2}:\d{2}\.\d{3}\s*-->\s*/;
  const flush = () => {
    if (!bucket.length) return;
    const text = normalizeCaptionText(bucket.join(' '));
    if (text) out.push(withTS && ts ? `[${ts}] ${text}` : text);
    bucket = [];
    ts = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('WEBVTT') || /^\d+$/.test(line)) {
      flush();
      continue;
    }
    if (timeRe.test(line)) {
      ts = line.split('-->')[0].trim().replace(/\.\d+$/, '');
      continue;
    }
    bucket.push(line);
  }
  flush();
  return out.join('\n');
};

export const xmlToText = (xmlString, withTS) => {
  try {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    const nodes = Array.from(doc.getElementsByTagName('text'));
    return nodes
      .map(n => {
        const raw = normalizeCaptionText(n.textContent || '');
        if (!raw) return null;
        if (!withTS) return raw;
        // YouTube XML provides either `start` (in seconds) or `t` (in milliseconds)
        const startAttr = n.getAttribute('start');
        const tAttr = n.getAttribute('t');
        let startMs = 0;
        if (tAttr != null) {
          startMs = Number(tAttr) || 0; // already in ms
        } else if (startAttr != null) {
          startMs = (Number(startAttr) || 0) * 1000; // seconds -> ms
        }
        return `[${msToTimestamp(startMs)}] ${raw}`;
      })
      .filter(Boolean)
      .join('\n');
  } catch {
    return '';
  }
};

export const detectTranscriptFormat = (body = '', contentType = '') => {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('json')) return 'json3';
  if (type.includes('xml')) return 'xml';
  if (type.includes('vtt')) return 'vtt';

  const sample = String(body || '').trimStart();
  if (!sample) return 'vtt';
  if (sample.startsWith('{') || sample.startsWith('[')) return 'json3';
  if (/^<\?xml\b/i.test(sample) || /^<transcript\b/i.test(sample) || /^<text\b/i.test(sample)) {
    return 'xml';
  }
  if (/^WEBVTT\b/i.test(sample) || /-->\s*/.test(sample.slice(0, 500))) return 'vtt';
  return 'vtt';
};

export const parseTranscript = (body, contentType, withTS) => {
  const format = detectTranscriptFormat(body, contentType);
  if (format === 'json3') {
    try {
      return json3ToText(JSON.parse(body), withTS);
    } catch {
      return '';
    }
  }
  if (format === 'xml') return xmlToText(body, withTS);
  return vttToText(body, withTS);
};

// --- YouTubeI get_transcript JSON parser ---------------------------------
const getTextFromRuns = (runs) => (Array.isArray(runs) ? runs.map(r => r.text || '').join('') : '');

const extractCueText = (cue) => {
  if (!cue) return '';
  if (typeof cue.simpleText === 'string') return cue.simpleText;
  if (Array.isArray(cue.runs)) return getTextFromRuns(cue.runs);
  return '';
};

const toMs = (txt) => {
  if (!txt) return 0;
  // Formats like 0:05, 01:02:03 etc. We keep seconds precision.
  const parts = String(txt).split(':').map(Number);
  let s = 0;
  if (parts.length === 3) s = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) s = parts[0] * 60 + parts[1];
  else s = parts[0] || 0;
  return Math.round(s * 1000);
};

export const parseYouTubeITranscript = (data, withTS) => {
  try {
    if (!data) return '';
    // Traverse to find any cue groups
    const groups = [];
    const stack = [data];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (Array.isArray(node)) { stack.push(...node); continue; }
      if (typeof node === 'object') {
        if (node.transcriptCueGroupRenderer) {
          groups.push(node.transcriptCueGroupRenderer);
        }
        for (const k in node) stack.push(node[k]);
      }
    }
    if (!groups.length) return '';

    const lines = [];
    for (const g of groups) {
      const cueR = g.cue?.transcriptCueRenderer || g.transcriptCueRenderer || null;
      const cueObj = cueR || g.cue;
      const text = normalizeCaptionText(extractCueText(cueObj?.cue || cueObj?.text || cueObj));
      if (!text) continue;
      if (withTS) {
        const ts = cueObj?.startTimeText?.simpleText || g.formattedStartTime?.simpleText || null;
        const ms = ts ? toMs(ts) : Number(cueObj?.startOffsetMs) || 0;
        lines.push(`[${msToTimestamp(ms)}] ${text}`);
      } else {
        lines.push(text);
      }
    }
    return lines.join('\n');
  } catch {
    return '';
  }
};
