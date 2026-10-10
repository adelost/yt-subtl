import { parseYouTubeITranscript } from '../../lib/parsers.js';
import { getCurrentVideoId } from '../../lib/youtube.js';

const matchesDefaultTrack = (data, player, track, videoId) => {
  if (data?.currentVideoEndpoint?.watchEndpoint?.videoId !== videoId || player?.videoDetails?.videoId !== videoId) return false;
  const captions = player.captions?.playerCaptionsTracklistRenderer;
  const defaultIndex = captions?.audioTracks?.[captions.defaultAudioTrackIndex ?? 0]?.defaultCaptionTrackIndex;
  if (!Number.isInteger(defaultIndex)) return false;
  const expected = captions.captionTracks?.[defaultIndex];
  return !!expected && expected.languageCode === track?.languageCode && (expected.kind || '') === (track?.kind || '') && (expected.vssId || '') === (track?.vssId || '');
};

/** WHAT: Reads the matching default-track transcript embedded by YouTube. WHY: Keeps stale page data or another language from being labeled as the selected track. */
export function readPageTranscript(data, player, track, videoId, withTS) {
  return matchesDefaultTrack(data, player, track, videoId) ? parseYouTubeITranscript(data, withTS) : '';
}

/** WHAT: Loads YouTube's modern transcript for the verified default track. WHY: Keeps native panel changes behind exact video and language fences. */
export async function tryPageData(track, videoId, withTS) {
  const node = document.querySelector('ytd-reel-video-renderer[is-active] ytd-player') || document.querySelector('ytd-player');
  const player = node?.getPlayer?.() || node?.player;
  const responses = [player?.getPlayerResponse?.(), window.ytInitialPlayerResponse].filter(Boolean);
  const candidates = () => [document.querySelector('ytd-watch-flexy')?.data, window.ytInitialData];
  if (!candidates().some(data => responses.some(response => matchesDefaultTrack(data, response, track, videoId)))) return { ok: false };
  const read = () => {
    if (getCurrentVideoId() !== videoId) return '';
    for (const data of candidates()) {
      for (const response of responses) {
        const text = readPageTranscript(data, response, track, videoId, withTS);
        if (text) return text;
      }
    }
    return '';
  };
  let text = read();
  if (text) return { ok: true, text, via: 'page:transcript' };
  const button = document.querySelector('ytd-video-description-transcript-section-renderer button');
  if (!button) return { ok: false };
  const nativePanel = () => [...document.querySelectorAll('ytd-engagement-panel-section-list-renderer')]
    .find(panel => panel.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED' && panel.querySelector('transcript-segment-view-model'));
  const alreadyOpen = !!nativePanel();
  button.click();
  const deadline = Date.now() + 2500;
  while (Date.now() < deadline && getCurrentVideoId() === videoId) {
    await new Promise(resolve => setTimeout(resolve, 100));
    text = read();
    if (text) {
      if (!alreadyOpen) nativePanel()?.querySelector('#visibility-button button, button[aria-label="Close"]')?.click();
      return { ok: true, text, via: 'page:transcript' };
    }
  }
  return { ok: false };
}
