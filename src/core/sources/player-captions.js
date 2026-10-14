import { awaitHarvestedCaption, harvestedCaption } from '../../lib/harvest.js';
import { parseTranscript } from '../../lib/parsers.js';
import { getCurrentVideoId, getPlayerApi, isAdShowing } from '../../lib/youtube.js';
import { reportStatus } from '../../shared/status-bus.js';

const CAPTION_WAIT_MS = 6000;
const TRACKLIST_WAIT_MS = 3000;
const AD_WAIT_MS = 60000;
const POLL_MS = 250;
// YouTube saves the last chosen caption language here; a transcript request must not change it.
const PREFERENCE_KEYS = ['yt-player-caption-sticky-language', 'yt-player-caption-persistence'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** WHAT: Resolves a page caption track to the player's own track object. WHY: Keeps auto-generated and manual captions of one language apart. */
export const findPlayerTrack = (playerTracks, track) => {
  const kind = track?.kind === 'asr' ? 'asr' : '';
  return (playerTracks || []).find((candidate) => track?.vssId && candidate.vss_id === track.vssId) ||
    (playerTracks || []).find((candidate) => candidate.languageCode === track?.languageCode && (candidate.kind || '') === kind) ||
    null;
};

const readCaption = (entry, withTS, via) => {
  const text = parseTranscript(entry.body, entry.contentType, withTS);
  return text.trim() ? { ok: true, text, via } : { ok: false, reason: 'YouTube returned this caption track empty.' };
};

/** WHAT: Polls until a condition holds, the video changes or time runs out. WHY: Keeps every wait bound to one video and a deadline. */
const waitUntil = async (condition, videoId, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (getCurrentVideoId() === videoId) {
    const value = condition();
    if (value || Date.now() >= deadline) return value;
    await sleep(POLL_MS);
  }
  return null;
};

/** WHAT: Waits while an ad occupies the player. WHY: Keeps the player from being asked for captions it cannot load yet. */
const adFinished = (videoId) => {
  if (!isAdShowing()) return true;
  reportStatus('Waiting for the ad to finish…');
  return waitUntil(() => !isAdShowing(), videoId, AD_WAIT_MS);
};

const playerTracks = (player) => {
  try { return player.getOption('captions', 'tracklist', { includeAsr: true }) || []; } catch { return []; }
};

const currentPlayerTrack = (player) => {
  try { return player.getOption('captions', 'track') || {}; } catch { return {}; }
};

/** WHAT: Snapshots the captions the viewer sees and prefers. WHY: Keeps a transcript request from changing their player. */
const rememberCaptionState = (player) => ({
  track: currentPlayerTrack(player),
  preferences: PREFERENCE_KEYS.map((key) => [key, localStorage.getItem(key)]),
});

const restoreCaptionState = (player, state) => {
  if (state.track.languageCode) player.setOption('captions', 'track', state.track);
  else player.unloadModule('captions');
  for (const [key, value] of state.preferences) {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  }
};

/** WHAT: Loads the selected track through YouTube's player and reads its response. WHY: Keeps requests without YouTube's token from replacing the player's own. */
export const tryPlayerCaptions = async (track, videoId, withTS) => {
  const cached = harvestedCaption(videoId, track);
  if (cached) return readCaption(cached, withTS, 'player:cached');

  const player = getPlayerApi();
  if (typeof player?.setOption !== 'function') return { ok: false };
  if (!(await adFinished(videoId))) {
    return { ok: false, reason: getCurrentVideoId() === videoId ? 'An ad is still playing. Try again when it ends.' : '' };
  }

  const state = rememberCaptionState(player);
  try {
    player.loadModule('captions');
    // Right after an ad the player can take a moment to list the video's own tracks.
    const target = await waitUntil(() => findPlayerTrack(playerTracks(player), track), videoId, TRACKLIST_WAIT_MS);
    if (!target) return { ok: false, reason: 'The YouTube player does not offer this caption track.' };
    reportStatus('Loading captions from the YouTube player…');
    const response = awaitHarvestedCaption(videoId, track, CAPTION_WAIT_MS);
    player.setOption('captions', 'track', target);
    const entry = await response;
    if (!entry) return { ok: false, reason: 'YouTube did not send this caption track.' };
    return readCaption(entry, withTS, 'player:captions');
  } finally {
    restoreCaptionState(player, state);
  }
};
