import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  search,
  selectedTrack,
  shouldResetForTrackUpdate,
  status,
  transcript,
  updateTracks,
  videoId,
  resetState,
} from '../src/ui/state.js';

const track = (overrides = {}) => ({
  languageCode: 'en',
  kind: '',
  vssId: '.en',
  name: { simpleText: 'English' },
  baseUrl: 'https://www.youtube.com/api/timedtext?v=abc&lang=en',
  ...overrides,
});

afterEach(() => {
  resetState();
});

describe('shouldResetForTrackUpdate', () => {
  it('should not reset when the same video reports the same tracks again', () => {
    const current = [track()];
    const next = [track()];
    assert.strictEqual(shouldResetForTrackUpdate('abc', current, 'abc', next), false);
  });

  it('should reset when the video id changes', () => {
    assert.strictEqual(shouldResetForTrackUpdate('abc', [track()], 'def', [track()]), true);
  });
});

describe('updateTracks', () => {
  it('should preserve loaded transcript state for duplicate YouTube page-data updates', () => {
    updateTracks([track()], 'abc');
    transcript.set('Loaded transcript');
    search.set('needle');
    status.set('Loaded: en');

    updateTracks([track()], 'abc');

    assert.strictEqual(videoId.get(), 'abc');
    assert.strictEqual(selectedTrack.get(), 0);
    assert.strictEqual(transcript.get(), 'Loaded transcript');
    assert.strictEqual(search.get(), 'needle');
    assert.strictEqual(status.get(), 'Loaded: en');
  });

  it('should clear loaded transcript state for a different video', () => {
    updateTracks([track()], 'abc');
    transcript.set('Loaded transcript');
    search.set('needle');
    status.set('Loaded: en');

    updateTracks([track({ baseUrl: 'https://www.youtube.com/api/timedtext?v=def&lang=en' })], 'def');

    assert.strictEqual(videoId.get(), 'def');
    assert.strictEqual(transcript.get(), '');
    assert.strictEqual(search.get(), '');
    assert.strictEqual(status.get(), '');
  });
});
