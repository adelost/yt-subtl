import { describe, it } from 'node:test';
import assert from 'node:assert';
import { json3ToText, vttToText, xmlToText } from '../src/lib/parsers.js';

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
