import { afterEach, it } from 'node:test';
import assert from 'node:assert/strict';
import { doFetch } from '../src/ui/actions.js';
import { updateTracks, resetState, transcript, displayTranscript, includeTimestamps, loading, status } from '../src/ui/state.js';

const tracks = [{ languageCode: 'en', baseUrl: 'https://www.youtube.com/api/timedtext?lang=en' }];
afterEach(() => { resetState(); includeTimestamps.set(true); });

it('retains seeking timestamps while immediately projecting the user display/export choice', async () => {
  updateTracks(tracks, 'first');
  includeTimestamps.set(false);
  await doFetch({ load: async (_track, _id, timestamps) => {
    assert.equal(timestamps, true);
    return '[00:01] Hello\n[00:02] World';
  } });
  assert.equal(displayTranscript.get(), 'Hello\nWorld');
  assert.equal(transcript.get(), '[00:01] Hello\n[00:02] World');
  includeTimestamps.set(true);
  assert.equal(displayTranscript.get(), transcript.get());
});

it('ignores late completion and releases loading after navigation', async () => {
  updateTracks(tracks, 'first');
  let complete;
  const pending = doFetch({ load: () => new Promise((resolve) => { complete = resolve; }) });
  resetState();
  updateTracks(tracks, 'second');
  complete('[00:01] Old video');
  assert.equal(await pending, false);
  assert.equal(transcript.get(), '');
  assert.equal(loading.get(), false);
});

it('names the loaded track in plain language instead of its language code', async () => {
  updateTracks([{ languageCode: 'en', kind: 'asr', name: { simpleText: 'English' } }], 'first');
  await doFetch({ load: async () => '[00:01] Hello' });
  assert.equal(status.get(), 'English (auto)');
});
