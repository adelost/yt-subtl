import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectTranscriptFormat, json3ToText, parseTranscript, vttToText, xmlToText } from '../src/lib/parsers.js';

describe('detectTranscriptFormat', () => {
  it('should detect JSON transcripts from body when content type is generic', () => {
    assert.strictEqual(detectTranscriptFormat('{"events":[]}', 'text/plain'), 'json3');
  });

  it('should detect XML transcripts from body when content type is missing', () => {
    assert.strictEqual(detectTranscriptFormat('<transcript><text>Hello</text></transcript>', ''), 'xml');
  });

  it('should detect VTT transcripts from body or content type', () => {
    assert.strictEqual(detectTranscriptFormat('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHi', ''), 'vtt');
    assert.strictEqual(detectTranscriptFormat('', 'text/vtt'), 'vtt');
  });
});

describe('json3ToText', () => {
  it('should parse json3 format without timestamps', () => {
    const json = {
      events: [
        { segs: [{ utf8: 'Hello ' }, { utf8: 'world' }], tStartMs: 0 },
        { segs: [{ utf8: 'Test\n' }, { utf8: 'text' }], tStartMs: 1000 }
      ]
    };
    const result = json3ToText(json, false);
    assert.strictEqual(result, 'Hello world\nTest text');
  });

  it('should parse json3 format with timestamps', () => {
    const json = {
      events: [
        { segs: [{ utf8: 'Hello' }], tStartMs: 0 },
        { segs: [{ utf8: 'World' }], tStartMs: 5000 }
      ]
    };
    const result = json3ToText(json, true);
    assert.strictEqual(result, '[00:00] Hello\n[00:05] World');
  });

  it('should handle empty events', () => {
    const json = { events: [] };
    const result = json3ToText(json, false);
    assert.strictEqual(result, '');
  });

  it('should skip events without segs', () => {
    const json = {
      events: [
        { tStartMs: 0 },
        { segs: [{ utf8: 'Valid' }], tStartMs: 1000 }
      ]
    };
    const result = json3ToText(json, false);
    assert.strictEqual(result, 'Valid');
  });
});

describe('parseTranscript', () => {
  it('should parse JSON captions even when YouTube returns a generic content type', () => {
    const body = JSON.stringify({
      events: [
        { segs: [{ utf8: 'Headerless JSON' }], tStartMs: 5000 }
      ]
    });
    const result = parseTranscript(body, 'text/plain', true);
    assert.strictEqual(result, '[00:05] Headerless JSON');
  });
});

describe('vttToText', () => {
  it('should parse VTT format without timestamps', () => {
    const vtt = `WEBVTT

1
00:00:00.000 --> 00:00:02.000
Hello world

2
00:00:02.000 --> 00:00:04.000
Test text`;
    const result = vttToText(vtt, false);
    assert.strictEqual(result, 'Hello world\nTest text');
  });

  it('should parse VTT format with timestamps', () => {
    const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:02.000
Hello`;
    const result = vttToText(vtt, true);
    assert.strictEqual(result, '[00:00:01] Hello');
  });

  it('should strip cue tags and decode common HTML entities', () => {
    const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:02.000
<c.colorE5E5E5>Hello</c> &amp; <i>world</i>`;
    const result = vttToText(vtt, false);
    assert.strictEqual(result, 'Hello & world');
  });
});

describe('xmlToText', () => {
  it.skip('should parse XML format without timestamps (browser-only)', () => {
    // Note: xmlToText uses DOMParser which is only available in browser
    // This test requires a browser environment or JSDOM
  });

  it.skip('should parse XML format with timestamps (browser-only)', () => {
    // Note: xmlToText uses DOMParser which is only available in browser
    // This test requires a browser environment or JSDOM
  });

  it('should handle malformed XML gracefully', () => {
    const xml = 'not valid xml';
    const result = xmlToText(xml, false);
    assert.strictEqual(result, '');
  });
});
