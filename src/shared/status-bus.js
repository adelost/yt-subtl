// Sources and the panel ship in one bundle, so progress needs no page events.
const listeners = new Set();

/** WHAT: Reports progress of a transcript request. WHY: Keeps sources free of UI imports. */
export const reportStatus = (msg) => {
  if (msg) for (const listener of listeners) listener(String(msg));
};

/** WHAT: Routes transcript request progress to one listener. WHY: Keeps the panel status in step with the source at work. */
export const onStatus = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
