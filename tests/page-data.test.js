import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readPageTranscript } from '../src/core/sources/page-data.js';

const track = { languageCode: 'en', vssId: '.en' };
const player = { videoDetails: { videoId: 'current' }, captions: { playerCaptionsTracklistRenderer: {
  captionTracks: [{ languageCode: 'de', vssId: '.de' }, track], audioTracks: [{ defaultCaptionTrackIndex: 1 }], defaultAudioTrackIndex: 0,
} } };
const data = { currentVideoEndpoint: { watchEndpoint: { videoId: 'current' } }, engagementPanels: [{ transcriptSegmentViewModel: { simpleText: 'Real caption', timestamp: '0:07' } }] };

it('reads modern page captions only for the explicitly declared default track', () => {
  assert.equal(readPageTranscript(data, player, track, 'current', true), '[00:07] Real caption');
});
it('rejects another selected language instead of silently returning English', () => {
  assert.equal(readPageTranscript(data, player, { languageCode: 'de', vssId: '.de' }, 'current', true), '');
});
it('rejects old page data or old player identity during navigation', () => {
  assert.equal(readPageTranscript(data, player, track, 'new', true), '');
  assert.equal(readPageTranscript(data, { ...player, videoDetails: { videoId: 'old' } }, track, 'current', true), '');
});
it('does not assume track zero when the default identity is missing', () => {
  const unknown = { ...player, captions: { playerCaptionsTracklistRenderer: { captionTracks: [track] } } };
  assert.equal(readPageTranscript(data, unknown, track, 'current', true), '');
});
