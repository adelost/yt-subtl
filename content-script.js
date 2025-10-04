(() => {
  const PANEL_ID = 'ytxt-panel';
  const PANEL_CLASS = 'ytxt-panel';
  const REQUEST_TYPE = 'YTXT_REQUEST_CAPTIONS';

  let current = {
    tracks: [],
    videoId: null
  };

  // --- Utilities ------------------------------------------------------------
  const msToTimestamp = (ms) => {
    ms = Math.max(0, Number(ms) || 0);
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return (h > 0 ? String(h).padStart(2, '0') + ':' : '') +
           String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };

  const pickBestTrack = (tracks) => {
    if (!tracks || !tracks.length) return null;
    const lang = (navigator.language || 'en').split('-')[0];
    // Prefer human-made track in user language
    let cand = tracks.find(t => t.languageCode === lang && t.kind !== 'asr');
    if (cand) return cand;
    // Any track in user language
    cand = tracks.find(t => t.languageCode === lang);
    if (cand) return cand;
    // Any English human-made
    cand = tracks.find(t => t.languageCode?.startsWith('en') && t.kind !== 'asr');
    if (cand) return cand;
    // First available
    return tracks[0];
  };

  const ensureQueryParam = (url, key, val) => {
    const u = new URL(url);
    if (!u.searchParams.has(key)) u.searchParams.set(key, val);
    return u.toString();
  };

  const fetchCaptionViaBG = (url) => new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'FETCH_CAPTION', url }, (resp) => resolve(resp));
  });

  const json3ToText = (json, withTS) => {
    if (!json || !Array.isArray(json.events)) return '';
    const out = [];
    for (const ev of json.events) {
      if (!ev || !ev.segs) continue;
      const text = ev.segs.map(s => s.utf8 || '').join('').replace(/\s*\n+\s*/g, ' ').trim();
      if (!text) continue;
      out.push(withTS ? `[${msToTimestamp(ev.tStartMs || 0)}] ${text}` : text);
    }
    return out.join('\n');
  };

  const vttToText = (vtt, withTS) => {
    const lines = vtt.split(/\r?\n/);
    const out = [];
    let bucket = [];
    let ts = null;
    const timeRe = /(\d{2}:)?\d{2}:\d{2}\.\d{3}\s*-->\s*(\d{2}:)?\d{2}:\d{2}\.\d{3}/;

    const flush = () => {
      if (!bucket.length) return;
      out.push(withTS && ts ? `[${ts}] ${bucket.join(' ')}` : bucket.join(' '));
      bucket = [];
      ts = null;
    };

    for (let raw of lines) {
      const line = (raw || '').trim();
      if (line === '' || line.startsWith('WEBVTT') || /^\d+$/.test(line)) {
        if (line === '') flush();
        continue;
      }
      if (timeRe.test(line)) {
        const start = line.split('-->')[0].trim().replace(/\.\d+$/, '');
        ts = start;
        continue;
      }
      bucket.push(line);
    }
    flush();
    return out.join('\n');
  };

  const xmlToText = (xmlString, withTS) => {
    try {
      const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
      const nodes = Array.from(doc.getElementsByTagName('text'));
      const out = [];
      for (const n of nodes) {
        const raw = (n.textContent || '').replace(/\s*\n+\s*/g, ' ').trim();
        if (!raw) continue;
        if (withTS) {
          const start = Number(n.getAttribute('start') || n.getAttribute('t') || 0) * 1000;
          out.push(`[${msToTimestamp(start)}] ${raw}`);
        } else {
          out.push(raw);
        }
      }
      return out.join('\n');
    } catch {
      return '';
    }
  };

  const findSidebar = () =>
    document.getElementById('secondary') ||
    document.getElementById('secondary-inner') ||
    document.querySelector('#secondary') ||
    null;

  // --- Panel ---------------------------------------------------------------
  const createPanel = () => {
    if (document.getElementById(PANEL_ID)) return document.getElementById(PANEL_ID);

    const container = document.createElement('div');
    container.id = PANEL_ID;
    container.className = PANEL_CLASS;
    container.innerHTML = `
      <div class="ytxt-header">
        <div class="ytxt-title">YouTube Transcript</div>
        <div class="ytxt-tools">
          <label class="ytxt-toggle">
            <input type="checkbox" id="ytxt-timestamps" />
            <span>timestamps</span>
          </label>
          <button class="ytxt-btn" id="ytxt-copy" title="Copy to clipboard">Copy</button>
          <button class="ytxt-btn" id="ytxt-download" title="Download .txt">Download</button>
        </div>
      </div>

      <div class="ytxt-row">
        <button class="ytxt-cta" id="ytxt-get">Get Subtitles</button>
        <select id="ytxt-track" class="ytxt-select" title="Caption track"></select>
      </div>

      <textarea id="ytxt-output" class="ytxt-output" rows="16" placeholder="Transcript will appear here..."></textarea>

      <div class="ytxt-footnote" id="ytxt-status"></div>
    `;

    // Try to mount inside right column; fall back to fixed if needed.
    const sidebar = findSidebar();
    if (sidebar) {
      // Place near the top of "Up next" column so it's visible immediately.
      sidebar.prepend(container);
    } else {
      // Fallback: float fixed
      container.classList.add('ytxt-floating');
      document.body.appendChild(container);
    }

    // Wire actions
    const btnGet = container.querySelector('#ytxt-get');
    const btnCopy = container.querySelector('#ytxt-copy');
    const btnDL  = container.querySelector('#ytxt-download');
    const sel    = container.querySelector('#ytxt-track');
    const out    = container.querySelector('#ytxt-output');
    const chkTS  = container.querySelector('#ytxt-timestamps');
    const status = container.querySelector('#ytxt-status');

    const setStatus = (msg, kind = '') => {
      status.textContent = msg || '';
      status.className = 'ytxt-footnote ' + (kind ? `ytxt-${kind}` : '');
    };

    const refreshTrackOptions = () => {
      sel.innerHTML = '';
      if (!current.tracks || !current.tracks.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No captions available';
        sel.appendChild(opt);
        sel.disabled = true;
        btnGet.disabled = true;
        return;
      }
      sel.disabled = false;
      btnGet.disabled = false;

      const best = pickBestTrack(current.tracks);
      current.tracks.forEach((t, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        const label =
          (t.name?.simpleText || t.languageCode || `Track ${i + 1}`) +
          (t.kind === 'asr' ? ' (auto)' : '') +
          (t.languageCode ? ` [${t.languageCode}]` : '');
        opt.textContent = label;
        if (t === best) opt.selected = true;
        sel.appendChild(opt);
      });
    };

    const fetchTranscript = async () => {
      try {
        if (!current.tracks || !current.tracks.length) {
          setStatus('No captions found for this video.', 'warn');
          return;
        }
        const idx = parseInt(sel.value, 10);
        if (Number.isNaN(idx) || !current.tracks[idx]) {
          setStatus('Please select a caption track.', 'warn');
          return;
        }
        const track = current.tracks[idx];
        let url = track.baseUrl;

        // First attempt: json3 (rich, reliable)
        url = ensureQueryParam(url, 'fmt', 'json3');

        setStatus('Fetching subtitles...');
        const r1 = await fetchCaptionViaBG(url);

        if (r1?.ok) {
          if ((r1.contentType || '').includes('application/json')) {
            const json = JSON.parse(r1.body);
            const text = json3ToText(json, chkTS.checked);
            if (text && text.trim()) {
              out.value = text;
              setStatus(`Loaded ${text.split('\n').length} lines from ${track.languageCode}${track.kind === 'asr' ? ' (auto)' : ''}.`, 'ok');
              return;
            }
          } else if ((r1.contentType || '').includes('text/xml')) {
            // Some tracks return XML even with fmt param; handle anyway
            const text = xmlToText(r1.body, chkTS.checked);
            if (text && text.trim()) {
              out.value = text;
              setStatus(`Loaded transcript (XML) from ${track.languageCode}.`, 'ok');
              return;
            }
          }
        }

        // Fallback 1: WebVTT
        let vttUrl = track.baseUrl;
        vttUrl = ensureQueryParam(vttUrl, 'fmt', 'vtt');
        const r2 = await fetchCaptionViaBG(vttUrl);
        if (r2?.ok && (r2.contentType || '').includes('text')) {
          const text = vttToText(r2.body, chkTS.checked);
          if (text && text.trim()) {
            out.value = text;
            setStatus(`Loaded transcript (VTT) from ${track.languageCode}.`, 'ok');
            return;
          }
        }

        // Fallback 2: raw XML (no fmt)
        const r3 = await fetchCaptionViaBG(track.baseUrl);
        if (r3?.ok) {
          const text = xmlToText(r3.body, chkTS.checked);
          if (text && text.trim()) {
            out.value = text;
            setStatus(`Loaded transcript (XML) from ${track.languageCode}.`, 'ok');
            return;
          }
        }

        setStatus('Unable to parse subtitles for this track.', 'error');
      } catch (err) {
        console.error(err);
        setStatus('Error fetching subtitles (see console).', 'error');
      }
    };

    btnGet.addEventListener('click', fetchTranscript);

    btnCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(out.value || '');
        setStatus('Copied to clipboard.', 'ok');
      } catch {
        setStatus('Copy failed. Select all and use Ctrl/Cmd+C.', 'warn');
      }
    });

    btnDL.addEventListener('click', () => {
      const blob = new Blob([out.value || ''], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const base = current.videoId ? `youtube-${current.videoId}` : 'youtube-transcript';
      a.download = `${base}.txt`;
      document.body.appendChild(a);
      a.click();
      requestAnimationFrame(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      });
      setStatus('Downloaded transcript as .txt.', 'ok');
    });

    // Initialize options
    refreshTrackOptions();

    return container;
  };

  const destroyPanel = () => {
    const el = document.getElementById(PANEL_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  };

  const mountPanelIfNeeded = () => {
    if (!document.getElementById(PANEL_ID)) createPanel();
  };

  const requestCaptionUpdate = () => {
    window.postMessage({ type: REQUEST_TYPE }, '*');
  };

  const onPageEvent = () => {
    current.tracks = [];
    current.videoId = null;
    destroyPanel();
    mountPanelIfNeeded();
    // Ask inpage script for the latest tracks/video
    requestCaptionUpdate();
  };

  // Listen for caption data pushed from inpage
  window.addEventListener('message', (ev) => {
    if (!ev || !ev.data || ev.data.type !== 'YTXT_CAPTIONS') return;
    current.tracks = ev.data.tracks || [];
    current.videoId = ev.data.videoId || null;

    // Ensure panel exists and refresh track options
    const panel = document.getElementById(PANEL_ID) || createPanel();
    const sel = panel.querySelector('#ytxt-track');
    const btnGet = panel.querySelector('#ytxt-get');

    // Refresh options now that we have tracks
    sel.innerHTML = '';
    if (!current.tracks.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No captions available';
      sel.appendChild(opt);
      sel.disabled = true;
      btnGet.disabled = true;
    } else {
      sel.disabled = false;
      btnGet.disabled = false;
      const best = pickBestTrack(current.tracks);
      current.tracks.forEach((t, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        const label =
          (t.name?.simpleText || t.languageCode || `Track ${i + 1}`) +
          (t.kind === 'asr' ? ' (auto)' : '') +
          (t.languageCode ? ` [${t.languageCode}]` : '');
        opt.textContent = label;
        if (t === best) opt.selected = true;
        sel.appendChild(opt);
      });
    }
  });

  // YouTube SPA navigation hooks
  window.addEventListener('yt-navigate-finish', onPageEvent);
  window.addEventListener('yt-page-data-updated', onPageEvent);

  // Mutation observer (backup) to mount panel if sidebar appears later
  const mo = new MutationObserver(() => {
    if (!document.getElementById(PANEL_ID) && findSidebar()) {
      createPanel();
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Inject inpage script to access YouTube internal objects
  const injectInpage = () => {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('inpage.js');
    s.type = 'text/javascript';
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  };

  // Init
  injectInpage();
  mountPanelIfNeeded();
  requestCaptionUpdate();
})();
