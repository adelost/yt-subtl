// Generic utility functions

export const msToTimestamp = (ms) => {
  const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return (h > 0 ? String(h).padStart(2, '0') + ':' : '') +
         String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

export const fetchCaption = async (url) => {
  // Fetch directly from MAIN world - we have access to YouTube's cookies here
  try {
    const res = await fetch(url, {
      credentials: 'include',
      // Use same-origin semantics; YouTube may reject CORS-mode requests
      mode: 'same-origin'
    });

    const contentType = res.headers.get('content-type') || 'unknown';

    // Collect response metadata for debugging
    const responseInfo = {
      status: res.status,
      statusText: res.statusText,
      redirected: res.redirected,
      type: res.type,
      url: res.url,
      contentType: contentType
    };

    // Try reading body, with arrayBuffer fallback if text is empty/unavailable
    let body = '';
    let textErr = null;
    try {
      body = await res.clone().text();
    } catch (e) {
      textErr = e;
    }

    if (!body || body.length === 0) {
      try {
        const ab = await res.clone().arrayBuffer();
        if (ab && ab.byteLength > 0) {
          // Attempt to decode using TextDecoder; default to utf-8
          const charsetMatch = /charset=([^;]+)/i.exec(contentType || '') || [];
          const charset = (charsetMatch[1] || 'utf-8').trim();
          try {
            const dec = new TextDecoder(charset);
            body = dec.decode(ab);
          } catch (_) {
            const dec = new TextDecoder('utf-8');
            body = dec.decode(ab);
          }
        }
      } catch (e) {
        // Ignore; will be handled below with headers/metadata
      }
    }

    if (!res.ok) {
      const headers = {};
      res.headers.forEach((value, key) => { headers[key] = value; });
      return {
        ok: false,
        error: `HTTP ${res.status}`,
        details: `Response: ${JSON.stringify(responseInfo)}\nHeaders: ${JSON.stringify(headers)}\nBody: ${String(body || '').substring(0, 500)}`
      };
    }

    if (!body || body.length === 0) {
      // Get headers for debugging
      const headers = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // As a last resort, try XHR same-origin with credentials
      try {
        const { xhrBody, xhrType } = await new Promise((resolve, reject) => {
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'text';
            xhr.withCredentials = true;
            xhr.setRequestHeader('Accept', '*/*');
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve({ xhrBody: xhr.responseText || '', xhrType: xhr.getResponseHeader('Content-Type') || '' });
              }
              else reject(new Error(`XHR status ${xhr.status}`));
            };
            xhr.onerror = () => reject(new Error('XHR network error'));
            xhr.send();
          } catch (e) { reject(e); }
        });

        if (xhrBody && xhrBody.length > 0) {
          const finalType = xhrType || contentType || '';
          return { ok: true, status: res.status, contentType: finalType, body: xhrBody };
        }
      } catch (e) {
        // fall through to error
      }

      return {
        ok: false,
        error: 'Empty response body',
        details: `Response info: ${JSON.stringify(responseInfo)}\nHeaders: ${JSON.stringify(headers)}\nRequested: ${url}`
      };
    }

    // Check if we got HTML when we expected JSON/VTT
    if (contentType.includes('text/html')) {
      return {
        ok: false,
        error: 'Got HTML instead of captions',
        details: `Received HTML page instead of caption data.\nResponse: ${JSON.stringify(responseInfo)}\nBody preview: ${body.substring(0, 500)}`
      };
    }

    return { ok: true, status: res.status, contentType, body };
  } catch (err) {
    return {
      ok: false,
      error: err.message || String(err),
      details: `Network error: ${err.message}\nURL: ${url.substring(0, 150)}`
    };
  }
};

// Fetch YouTubeI get_transcript JSON using the track's params
export const fetchYTTranscript = async (params) => {
  try {
    const ytcfg = window.ytcfg?.get ? window.ytcfg : null;
    const apiKey = ytcfg?.get?.('INNERTUBE_API_KEY') || null;
    const ctx = ytcfg?.get?.('INNERTUBE_CONTEXT') || null;
    const clientName = ytcfg?.get?.('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = ytcfg?.get?.('INNERTUBE_CLIENT_VERSION') || '2.20241007.00.00';
    if (!apiKey) {
      return { ok: false, error: 'Missing INNERTUBE_API_KEY' };
    }

    const body = {
      context: ctx || {
        client: {
          hl: (navigator.language || 'en').replace('_', '-'),
          gl: 'US',
          clientName,
          clientVersion
        }
      },
      params
    };

    const url = `/youtubei/v1/get_transcript?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      mode: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'x-youtube-client-name': String(clientName),
        'x-youtube-client-version': String(clientVersion)
      },
      body: JSON.stringify(body)
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, details: text.substring(0, 300) };
    }
    if (!text) {
      return { ok: false, error: 'Empty YouTubeI response' };
    }
    let json;
    try { json = JSON.parse(text); } catch (e) {
      return { ok: false, error: 'Invalid JSON from YouTubeI', details: text.substring(0, 200) };
    }
    return { ok: true, json, contentType };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
};
