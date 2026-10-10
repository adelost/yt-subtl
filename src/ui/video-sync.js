import { parseTimestamp } from '../lib/helpers.js';
import { scrollChildToTop, setAttr } from '../lib/dom.js';
import { activeChipTime, filteredLines, view } from './state.js';

/** WHAT: Tracks the active caption on the current player. WHY: Keeps late-created/replaced video elements within one panel lifetime. */
export function bindVideoSync(container) {
  let video = null;
  const update = () => {
    if (!video || view.get() !== 'chips') return;
    let active = -1;
    for (const line of filteredLines.get()) {
      const seconds = parseTimestamp(line);
      if (seconds !== null && seconds <= video.currentTime) active = Math.max(active, seconds);
    }
    if (active === activeChipTime.get()) return;
    activeChipTime.set(active);
    let current;
    for (const chip of container.children) {
      const isActive = chip.dataset.seconds === String(active);
      setAttr(chip, 'data-active', isActive);
      if (isActive) current = chip;
    }
    if (current) scrollChildToTop(container, current, 6);
  };
  const bind = () => {
    const next = document.querySelector('ytd-reel-video-renderer[is-active] video') || document.querySelector('video');
    if (next === video) return;
    video?.removeEventListener('timeupdate', update);
    video = next;
    video?.addEventListener('timeupdate', update);
    update();
  };
  const observer = new MutationObserver(bind);
  observer.observe(document.body, { childList: true, subtree: true });
  bind();
  const unsubView = view.subscribe(update);
  const unsubLines = filteredLines.subscribe(update);
  return () => {
    observer.disconnect();
    video?.removeEventListener('timeupdate', update);
    unsubView();
    unsubLines();
  };
}
