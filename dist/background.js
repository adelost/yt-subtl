// Minimal fetch proxy so we can reliably grab cross-origin caption URLs.
// Inject page-context network observer early using chrome.scripting
const YT_HOST_RE = /(^|\.)youtube\.com$/i;
const shouldInject = (url) => {
  try {
    const u = new URL(url);
    return YT_HOST_RE.test(u.hostname);
  } catch { return false; }
};

const injectObserver = async (tabId) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        try {
          if (window.__ytxtObserverInstalled) return;
          window.__ytxtObserverInstalled = true;
          const toURL = (u) => { try { return new URL(u, location.origin); } catch { return null; } };
          const post = (d) => { try { window.dispatchEvent(new CustomEvent('ytxt:transcript-template', { detail: d })); } catch {} };
          const harvest = async (reqUrl, res, reqBody) => {
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
            p.then(res => { try { harvest(input, res, body); } catch {} });
            return p;
          };
          const xo = XMLHttpRequest.prototype.open; const xs = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.open = function(m,u,...r){ this.__ytxt = { m, u }; return xo.call(this,m,u,...r) };
          XMLHttpRequest.prototype.send = function(b){ const that=this; this.addEventListener('load', function(){ try{
            const info = that.__ytxt||{}; const url=info.u||''; const fakeRes = { clone: ()=>({ text: async()=> (typeof that.responseText==='string'?that.responseText:'') }), headers: { get: (k)=> that.getResponseHeader(k) } };
            const reqBody = (typeof b==='string')? b : null; harvest(url, fakeRes, reqBody);
          }catch{} }); return xs.call(this,b) };
          // Signal ready in console for debugging
          console.debug('[ytxt] Observer installed (MAIN world)');
        } catch {}
      }
    });
  } catch (e) {
    // ignore
  }
};

chrome.webNavigation && chrome.webNavigation.onCommitted && chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!shouldInject(details.url || '')) return;
  injectObserver(details.tabId);
});

chrome.webNavigation && chrome.webNavigation.onHistoryStateUpdated && chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!shouldInject(details.url || '')) return;
  injectObserver(details.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab?.url && shouldInject(tab.url)) {
    injectObserver(tabId);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'FETCH_CAPTION') {
    if (!msg.url) {
      sendResponse({ ok: false, error: 'No URL provided' });
      return;
    }

    // Use 'include' to pass cookies for authenticated content (members-only, age-restricted)
    fetch(msg.url, { credentials: 'include' })
      .then(async (res) => {
        if (!res) {
          sendResponse({ ok: false, error: 'Empty response' });
          return;
        }
        const contentType = res.headers.get('content-type') || '';
        const body = await res.text();

        // Include debug info in response
        sendResponse({
          ok: res.ok,
          status: res.status,
          contentType,
          body,
          _debug: {
            url: msg.url.substring(0, 100),
            status: res.status,
            contentType: contentType,
            bodyLength: body.length,
            bodyPreview: body.substring(0, 200)
          }
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err?.message || String(err) });
      });
    return true; // keep message channel open for async response
  }
  return false;
});
