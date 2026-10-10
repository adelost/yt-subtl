// YouTube-specific logic

/** WHAT: Reads a watch or Shorts video identity. WHY: Keeps unrelated pages out of the transcript lifecycle. */
export const getCurrentVideoId = (href = location.href) => {
  const url = new URL(href);
  return url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/shorts\/([^/]+)/)?.[1] || null;
};

/** WHAT: Resolves the response matching the current video. WHY: Keeps stale SPA data from supplying another video's captions. */
export const choosePlayerResponse = (responses, currentVideoId) => {
  const available = (responses || []).filter(Boolean);
  if (!currentVideoId) return available[0] || null;
  return available.find((response) => response?.videoDetails?.videoId === currentVideoId) || null;
};

/** WHAT: Reads tracks from the matching live player. WHY: Keeps the selected caption list tied to the current route. */
export const extractCaptionTracks = () => {
  try {
    const requestedVideoId = getCurrentVideoId();
    const ytdPlayer = document.querySelector('ytd-reel-video-renderer[is-active] ytd-player') || document.querySelector('ytd-player');
    const player = ytdPlayer?.getPlayer?.() || ytdPlayer?.player;
    const liveResponse = player?.getPlayerResponse?.() || null;
    const initialResponse = window.ytInitialPlayerResponse || null;
    const pr = choosePlayerResponse([liveResponse, initialResponse], requestedVideoId);
    const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
    const videoId = requestedVideoId || pr?.videoDetails?.videoId || null;

    return { tracks, videoId };
  } catch (e) {
    return { tracks: null, videoId: null, error: String(e) };
  }
};

/** WHAT: Resolves manual captions in the browser language. WHY: Keeps default track selection explicit and predictable. */
export const pickBestTrack = (tracks) => {
  if (!tracks?.length) return null;
  const lang = (globalThis.navigator?.language || 'en').split('-')[0];
  return tracks.find(t => t.languageCode === lang && t.kind !== 'asr') ||
         tracks.find(t => t.languageCode === lang) ||
         tracks.find(t => t.languageCode?.startsWith('en') && t.kind !== 'asr') ||
         tracks[0];
};
