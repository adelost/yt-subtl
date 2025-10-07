// YouTube-specific logic

export const extractCaptionTracks = () => {
  try {
    // Inject script into page context to access window.ytInitialPlayerResponse
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        const pr = window.ytInitialPlayerResponse;
        let tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
        let videoId = pr?.videoDetails?.videoId || null;

        // Fallback: try ytd-player
        if (!tracks) {
          const ytdPlayer = document.querySelector('ytd-player');
          const player = ytdPlayer?.getPlayer?.() || ytdPlayer?.player;
          const resp = player?.getPlayerResponse?.() || null;
          tracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
        }

        // Fallback: get videoId from URL
        if (!videoId) {
          videoId = new URLSearchParams(location.search).get('v');
        }

        document.documentElement.dataset.ytxtData = JSON.stringify({
          tracks: tracks,
          videoId: videoId
        });
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();

    // Read data back from data attribute
    const data = JSON.parse(document.documentElement.dataset.ytxtData || '{}');
    delete document.documentElement.dataset.ytxtData;

    return {
      tracks: data.tracks || null,
      videoId: data.videoId || null
    };
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
