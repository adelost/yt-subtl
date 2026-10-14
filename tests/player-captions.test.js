import { it } from 'node:test';
import assert from 'node:assert/strict';
import { awaitHarvestedCaption, describeCaptionUrl, onHarvestEvent } from '../src/lib/harvest.js';
import { findPlayerTrack } from '../src/core/sources/player-captions.js';

const captionUrl = (query) => `https://www.youtube.com/api/timedtext?${query}&fmt=json3&pot=token`;

it('stores a manual track as manual although the player adds caps=asr to every request', () => {
  assert.deepEqual(describeCaptionUrl(captionUrl('v=vid&caps=asr&lang=en')), { videoId: 'vid', key: 'en|manual' });
  assert.deepEqual(describeCaptionUrl(captionUrl('v=vid&caps=asr&kind=asr&lang=en')), { videoId: 'vid', key: 'en|asr' });
});

it('never stores a translation as the source language', () => {
  assert.equal(describeCaptionUrl(captionUrl('v=vid&lang=en&tlang=sv')), null);
});

it('resolves at once from captions the player fetched on its own, e.g. right after an ad', async () => {
  onHarvestEvent({ url: captionUrl('v=after-ad&lang=en'), body: '{"events":[]}', contentType: 'application/json' });
  const entry = await awaitHarvestedCaption('after-ad', { languageCode: 'en', kind: '' }, 50);
  assert.equal(entry?.body, '{"events":[]}');
});

it('keeps waiting through another video\'s captions', async () => {
  const pending = awaitHarvestedCaption('wanted', { languageCode: 'en' }, 50);
  onHarvestEvent({ url: captionUrl('v=ad-video&lang=en'), body: 'ad captions' });
  assert.equal(await pending, null);
});

it('matches auto-generated and manual captions of one language separately', () => {
  const tracks = [{ languageCode: 'en', kind: '', vss_id: '.en' }, { languageCode: 'en', kind: 'asr', vss_id: 'a.en' }];
  assert.equal(findPlayerTrack(tracks, { languageCode: 'en', kind: 'asr', vssId: 'a.en' }).vss_id, 'a.en');
  assert.equal(findPlayerTrack(tracks, { languageCode: 'en', kind: 'asr' }).vss_id, 'a.en');
  assert.equal(findPlayerTrack(tracks, { languageCode: 'en' }).vss_id, '.en');
  assert.equal(findPlayerTrack(tracks, { languageCode: 'sv' }), null);
});
