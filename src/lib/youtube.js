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

    // Debug: log extracted track URLs (full baseUrl + diagnostics)
    if (tracks?.length) {
      console.log('[ytxt] Extracted tracks:', tracks.map(t => {
        const s = String(t.baseUrl || '');
        return {
          lang: t.languageCode,
          kind: t.kind,
          vssId: t.vssId || t.vss_id,
          hasParamsProp: !!t.params,
          paramsLen: t.params ? String(t.params).length : 0,
          keys: Object.keys(t || {}).slice(0, 12),
          hasLangParam: /[?&]lang=/.test(s),
          hasFmtParam: /[?&]fmt=/.test(s),
          urlLen: s.length,
          head: s.slice(0, 140),
          tail: s.slice(-140)
        };
      }));
    }

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
