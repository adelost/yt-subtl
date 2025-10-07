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
