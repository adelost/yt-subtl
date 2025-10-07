// Harvest successful transcript requests made by the YouTube page itself
// Stores per-video templates for:
// - YouTubeI get_transcript (preferred)
// - timedtext with pot/potc (+ device hints)

const store = new Map(); // videoId -> { yti?: { params }, tt?: { byKey: Map<string, Entry> } }

const keyForTrack = (track) => {
  const lang = track?.languageCode || '';
  const kind = track?.kind || '';
  return `${lang}|${kind || 'manual'}`;
};

export const getTemplatesFor = (videoId) => store.get(videoId) || null;

export const onHarvestEvent = (detail) => {
  try {
    const { kind, url, params = {}, videoId, contentType = '', size = 0, body = '' } = detail || {};
    if (!videoId && params && typeof params.v === 'string') {
      // derive v from query if not provided
      detail.videoId = params.v;
    }
    const vid = detail.videoId;
    if (!vid) return;
    const bucket = store.get(vid) || { tt: { byKey: new Map() } };

    if (kind === 'youtubei') {
      // Capture params token if present in body (response body not useful here)
      // The injected observer sends request body params if available via detail.reqParams
      const p = detail.reqParams || null;
      if (p) bucket.yti = { params: p };
      store.set(vid, bucket);
      return;
    }

    if (kind === 'timedtext') {
      if (!url || !body || size <= 0) return;
      // Try to derive track key from lang/kind query params
      const lang = params.lang || null;
      const isAsr = params.kind === 'asr' || (params.cc && /^a\./.test(params.cc));
      const ttKey = `${lang || ''}|${isAsr ? 'asr' : 'manual'}`;
      bucket.tt.byKey.set(ttKey, { url, params, contentType, size, body });
      store.set(vid, bucket);
      return;
    }
  } catch {
    // ignore
  }
};

const wait = (ms) => new Promise(res => setTimeout(res, ms));

// Try to gently cause the page to fetch subtitles for the given track
export const nudgeForTrack = async (track) => {
  try {
    const ytdPlayer = document.querySelector('ytd-player');
    const player = ytdPlayer?.getPlayer?.() || ytdPlayer?.player;
    const ccBtn = document.querySelector('.ytp-subtitles-button');

    // Prefer using player API if available
    if (player?.setOption) {
      try {
        player.setOption('captions', 'track', {
          languageCode: track?.languageCode || 'en',
          kind: track?.kind === 'asr' ? 'asr' : undefined
        });
        // Enable captions briefly
        player.setOption('captions', 'enabled', true);
      } catch {}
    } else if (ccBtn) {
      // Toggle CC button to trigger a timedtext fetch
      const wasPressed = ccBtn.getAttribute('aria-pressed') === 'true';
      ccBtn.click();
      // restore after a short delay if we changed it
      setTimeout(() => {
        try {
          const pressed = ccBtn.getAttribute('aria-pressed') === 'true';
          if (pressed !== wasPressed) ccBtn.click();
        } catch {}
      }, 1200);
    }
  } catch {}
};

export const awaitTemplateForTrack = async (videoId, track, timeoutMs = 2500) => {
  const existing = store.get(videoId);
  const tKey = keyForTrack(track);
  if (existing?.yti?.params) return { kind: 'youtubei', data: existing.yti };
  const ttEntry = existing?.tt?.byKey?.get(tKey) || null;
  if (ttEntry) return { kind: 'timedtext', data: ttEntry };

  let done = false;
  let result = null;
  const onEvent = (e) => {
    try {
      const d = e?.detail || {};
      if (!d) return;
      if (d.kind === 'youtubei') {
        if (d.videoId === videoId && d.reqParams) {
          onHarvestEvent(d);
          result = { kind: 'youtubei', data: { params: d.reqParams } };
          done = true;
        }
        return;
      }
      if (d.kind === 'timedtext') {
        if (d.videoId === videoId) {
          onHarvestEvent(d);
          // try match on language
          const lang = d.params?.lang || null;
          const isAsr = d.params?.kind === 'asr' || (d.params?.cc && /^a\./.test(d.params.cc));
          const key = `${lang || ''}|${isAsr ? 'asr' : 'manual'}`;
          if (key === tKey && d.body && d.body.length > 0) {
            result = { kind: 'timedtext', data: d };
            done = true;
          }
        }
      }
    } catch {}
  };

  window.addEventListener('ytxt:transcript-template', onEvent);
  try {
    // Trigger page to fetch captions for this track
    nudgeForTrack(track);
    const start = Date.now();
    while (!done && Date.now() - start < timeoutMs) {
      await wait(120);
    }
  } finally {
    window.removeEventListener('ytxt:transcript-template', onEvent);
  }
  return result;
};

// Injection helper to install page-context observer
export const injectObserver = () => {
  try {
    if (window.__ytxtObserverInjected) return;
    window.__ytxtObserverInjected = true;
    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.textContent = `(() => { try {
      if (window.__ytxtObserverInstalled) return; window.__ytxtObserverInstalled = true;
      const toURL = (u) => { try { return new URL(u, location.origin); } catch { return null; } };
      const post = (d) => { try { window.dispatchEvent(new CustomEvent('ytxt:transcript-template', { detail: d })); } catch {} };
      const harvest = async (reqUrl, res, reqBody, headers) => {
        try {
          const u = toURL(String(reqUrl||'')); if (!u) return;
          const path = u.pathname || '';
          const isTT = path.includes('/api/timedtext');
          const isYTI = path.includes('/youtubei/') && path.includes('/get_transcript');
          if (!isTT && !isYTI) return;
          const clone = (res && res.clone) ? res.clone() : res;
          if (!clone || !clone.text) return;
          const text = await clone.text();
          if (!text || text.length === 0) return;
          const ct = (res && res.headers && res.headers.get && res.headers.get('content-type')) || '';
          const params = {}; if (u && u.searchParams) { u.searchParams.forEach((v,k)=>{params[k]=v}) }
          const vid = params.v || null;
          if (isTT) {
            post({ kind:'timedtext', url: u.toString(), params, videoId: vid, contentType: ct, size: text.length, body: text });
          } else if (isYTI) {
            let reqParams = null;
            if (reqBody && typeof reqBody === 'string') {
              try { const j = JSON.parse(reqBody); if (j && j.params) reqParams = j.params; } catch {}
            }
            post({ kind:'youtubei', url: u.toString(), videoId: vid, contentType: ct, size: text.length, body: text, reqParams });
          }
        } catch {}
      };
      const of = window.fetch.bind(window);
      window.fetch = function(input, init) {
        let body = init && init.body ? init.body : null;
        if (body && typeof body !== 'string') {
          try { body = JSON.stringify(body); } catch {}
        }
        const p = of(input, init);
        p.then(res => { try { harvest(input, res, body, (init && init.headers) || {}); } catch {} });
        return p;
      };
      const xo = XMLHttpRequest.prototype.open; const xs = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(m,u,...r){ this.__ytxt = { m, u }; return xo.call(this,m,u,...r) };
      XMLHttpRequest.prototype.send = function(b){ const that=this; this.addEventListener('load', function(){ try{
        const info = that.__ytxt||{}; const url=info.u||''; const res={ headers: { get: (k)=> that.getResponseHeader(k) } };
        const fakeRes = { clone: ()=>({ text: async()=> (typeof that.responseText==='string'?that.responseText:'') }), headers: { get: (k)=> that.getResponseHeader(k) } };
        const reqBody = (typeof b==='string')? b : null; harvest(url, fakeRes, reqBody, {});
      }catch{} }); return xs.call(this,b) };
    } catch(e) {} })();`;
    (document.head || document.documentElement).appendChild(s);
    setTimeout(() => s.remove(), 0);
  } catch {}
};

