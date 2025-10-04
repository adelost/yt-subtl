(() => {
  function extractCaptionTracks() {
    try {
      // Try direct global first
      const pr = window.ytInitialPlayerResponse;
      let tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;

      // Try player instance as fallback
      if (!tracks) {
        const ytdPlayer = document.querySelector('ytd-player');
        const player = ytdPlayer && (ytdPlayer.getPlayer ? ytdPlayer.getPlayer() : ytdPlayer.player);
        const resp = player && (player.getPlayerResponse ? player.getPlayerResponse() : null);
        tracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
      }

      const videoId = (() => {
        const fromUrl = new URL(location.href);
        return fromUrl.searchParams.get('v')
          || pr?.videoDetails?.videoId
          || null;
      })();

      return { tracks, videoId };
    } catch (e) {
      return { tracks: null, videoId: null, error: String(e) };
    }
  }

  function post() {
    const data = extractCaptionTracks();
    window.postMessage({ source: 'YTXT_INPAGE', type: 'YTXT_CAPTIONS', ...data }, '*');
  }

  // Respond on demand
  window.addEventListener('message', (ev) => {
    if (ev?.data?.type === 'YTXT_REQUEST_CAPTIONS') post();
  });

  // Keep up with YouTube's SPA navigation
  window.addEventListener('yt-navigate-finish', post);
  window.addEventListener('yt-page-data-updated', post);

  // Initial attempt
  setTimeout(post, 1000);
})();
