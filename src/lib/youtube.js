// YouTube-specific logic

export const extractCaptionTracks = () => {
  try {
    const pr = window.ytInitialPlayerResponse;
    let tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;

    if (!tracks) {
      const ytdPlayer = document.querySelector('ytd-player');
      const player = ytdPlayer?.getPlayer?.() || ytdPlayer?.player;
      const resp = player?.getPlayerResponse?.() || null;
      tracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
    }

    const videoId = new URL(location.href).searchParams.get('v') ||
                    pr?.videoDetails?.videoId || null;

    return { tracks, videoId };
  } catch (e) {
    return { tracks: null, videoId: null, error: String(e) };
  }
};

export const pickBestTrack = (tracks) => {
  if (!tracks?.length) return null;
  const lang = (navigator.language || 'en').split('-')[0];
  return tracks.find(t => t.languageCode === lang && t.kind !== 'asr') ||
         tracks.find(t => t.languageCode === lang) ||
         tracks.find(t => t.languageCode?.startsWith('en') && t.kind !== 'asr') ||
         tracks[0];
};
