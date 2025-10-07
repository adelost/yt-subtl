export const reportStatus = (msg) => {
  try {
    if (!msg) return;
    window.dispatchEvent(new CustomEvent('ytxt:status', { detail: String(msg) }));
  } catch {}
};

