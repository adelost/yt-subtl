import { describe, it } from 'node:test';
import assert from 'node:assert';
import { msToTimestamp } from '../src/lib/helpers.js';
import { choosePlayerResponse } from '../src/lib/youtube.js';

describe('msToTimestamp', () => {
  it('should convert milliseconds to HH:MM:SS format', () => {
    assert.strictEqual(msToTimestamp(0), '00:00');
    assert.strictEqual(msToTimestamp(1000), '00:01');
    assert.strictEqual(msToTimestamp(61000), '01:01');
    assert.strictEqual(msToTimestamp(3661000), '01:01:01');
  });

  it('should pad single digits with zeros', () => {
    assert.strictEqual(msToTimestamp(5000), '00:05');
    assert.strictEqual(msToTimestamp(65000), '01:05');
  });

  it('should handle hours correctly', () => {
    assert.strictEqual(msToTimestamp(3600000), '01:00:00');
    assert.strictEqual(msToTimestamp(7200000), '02:00:00');
  });

  it('should handle negative values as zero', () => {
    assert.strictEqual(msToTimestamp(-1000), '00:00');
  });

  it('should handle invalid input', () => {
    assert.strictEqual(msToTimestamp(null), '00:00');
    assert.strictEqual(msToTimestamp(undefined), '00:00');
    assert.strictEqual(msToTimestamp('invalid'), '00:00');
  });
});

describe('choosePlayerResponse', () => {
  const response = (videoId) => ({ videoDetails: { videoId } });

  it('uses the live response matching the current SPA video', () => {
    const oldInitial = response('old');
    const live = response('new');
    assert.strictEqual(choosePlayerResponse([live, oldInitial], 'new'), live);
  });

  it('does not reuse stale tracks while the new player response is pending', () => {
    assert.strictEqual(choosePlayerResponse([response('old')], 'new'), null);
  });
});
