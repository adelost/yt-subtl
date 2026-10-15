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
  loading,
  wordCount,
  copyFeedback,
  matchLabel,
  trackLabel,
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
  it('invalidates a loaded transcript and in-flight request when the caption track changes', () => {
    updateTracks([track(), track({ languageCode: 'sv', vssId: '.sv' })], 'abc');
    transcript.set('[00:01] Old English caption');
    loading.set(true);
    selectedTrack.set(1);
    assert.strictEqual(transcript.get(), '');
    assert.strictEqual(loading.get(), false);
  });
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

describe('copy and search feedback', () => {
  it('counts spoken words without the timestamps', () => {
    transcript.set('[00:01] Hello there\n[01:02:03] General Kenobi');
    assert.strictEqual(wordCount.get(), 4);
  });

  it('says how much the quick copy put on the clipboard', () => {
    assert.strictEqual(copyFeedback('ok', 568), 'Copied 568 words');
    assert.strictEqual(copyFeedback('ok', 1), 'Copied 1 word');
    assert.strictEqual(copyFeedback('error', 568), 'Could not copy');
    assert.strictEqual(copyFeedback('idle', 568), '');
  });

  it('labels the number of search matches in words', () => {
    transcript.set('[00:01] atoms\n[00:02] more atoms\n[00:03] nothing');
    search.set('atoms');
    assert.strictEqual(matchLabel.get(), '2 matches');
    search.set('nothing');
    assert.strictEqual(matchLabel.get(), '1 match');
    search.set('zzz');
    assert.strictEqual(matchLabel.get(), 'No matches for “zzz”');
  });
});

describe('trackLabel', () => {
  it('marks auto-generated captions once, even when YouTube already says so', () => {
    assert.strictEqual(trackLabel({ languageCode: 'en', kind: 'asr', name: { simpleText: 'English' } }, 0), 'English (auto)');
    assert.strictEqual(trackLabel({ languageCode: 'en', kind: 'asr', name: { runs: [{ text: 'English (auto-generated)' }] } }, 0), 'English (auto-generated)');
  });
});
