// Transcript format parsers

import { msToTimestamp } from './utils.js';

export const json3ToText = (json, withTS) => {
  if (!json?.events) return '';
  return json.events
    .filter(ev => ev?.segs)
    .map(ev => {
      const text = ev.segs.map(s => s.utf8 || '').join('').replace(/\s*\n+\s*/g, ' ').trim();
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

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('WEBVTT') || /^\d+$/.test(line)) {
      if (bucket.length) {
        out.push(withTS && ts ? `[${ts}] ${bucket.join(' ')}` : bucket.join(' '));
        bucket = [];
        ts = null;
      }
      continue;
    }
    if (timeRe.test(line)) {
      ts = line.split('-->')[0].trim().replace(/\.\d+$/, '');
      continue;
    }
    bucket.push(line);
  }
  if (bucket.length) out.push(withTS && ts ? `[${ts}] ${bucket.join(' ')}` : bucket.join(' '));
  return out.join('\n');
};

export const xmlToText = (xmlString, withTS) => {
  try {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    const nodes = Array.from(doc.getElementsByTagName('text'));
    return nodes
      .map(n => {
        const raw = (n.textContent || '').replace(/\s*\n+\s*/g, ' ').trim();
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

export const parseTranscript = (body, contentType, withTS) => {
  if (contentType.includes('json')) return json3ToText(JSON.parse(body), withTS);
  if (contentType.includes('xml')) return xmlToText(body, withTS);
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
      const text = extractCueText(cueObj?.cue || cueObj?.text || cueObj);
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
