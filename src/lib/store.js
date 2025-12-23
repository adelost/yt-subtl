/**
 * Minimal reactive store implementation
 *
 * Usage:
 *   const count = writable(0);
 *   const unsub = count.subscribe(val => console.log(val));
 *   count.set(1);
 *   count.update(n => n + 1);
 *   unsub();
 *
 *   const double = derived(count, n => n * 2);
 */

// Create a writable store
export function writable(initial) {
  let value = initial;
  const subs = new Set();

  return {
    subscribe(fn) {
      subs.add(fn);
      fn(value);
      return () => subs.delete(fn);
    },
    set(v) {
      if (v === value) return;
      value = v;
      subs.forEach((fn) => fn(value));
    },
    update(fn) {
      this.set(fn(value));
    },
    get() {
      return value;
    },
  };
}

// Create a derived store
export function derived(stores, fn) {
  const storeArray = Array.isArray(stores) ? stores : [stores];
  const subs = new Set();
  let value;
  let started = false;
  const unsubs = [];

  const sync = () => {
    const values = storeArray.map((s) => s.get());
    const newValue = Array.isArray(stores) ? fn(values) : fn(values[0]);
    if (newValue !== value) {
      value = newValue;
      subs.forEach((fn) => fn(value));
    }
  };

  const start = () => {
    if (started) return;
    started = true;
    for (const store of storeArray) {
      unsubs.push(store.subscribe(sync));
    }
  };

  const stop = () => {
    started = false;
    unsubs.forEach((u) => u());
    unsubs.length = 0;
  };

  return {
    subscribe(fn) {
      if (subs.size === 0) start();
      subs.add(fn);
      fn(value);
      return () => {
        subs.delete(fn);
        if (subs.size === 0) stop();
      };
    },
    get() {
      if (!started) {
        const values = storeArray.map((s) => s.get());
        return Array.isArray(stores) ? fn(values) : fn(values[0]);
      }
      return value;
    },
  };
}

// Create a store that persists to localStorage
export function persisted(key, initial, options = {}) {
  const { serialize = JSON.stringify, deserialize = JSON.parse } = options;

  let stored;
  try {
    const raw = localStorage.getItem(key);
    stored = raw !== null ? deserialize(raw) : initial;
  } catch {
    stored = initial;
  }

  const store = writable(stored);
  const originalSet = store.set.bind(store);

  store.set = (value) => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch {}
    originalSet(value);
  };

  return store;
}

// Helper to subscribe to multiple stores
export function subscribeAll(stores, callback) {
  const values = new Map();
  const unsubs = [];

  const notify = () => {
    callback(Object.fromEntries(values));
  };

  for (const [key, store] of Object.entries(stores)) {
    unsubs.push(
      store.subscribe((val) => {
        values.set(key, val);
        if (values.size === Object.keys(stores).length) {
          notify();
        }
      })
    );
  }

  return () => unsubs.forEach((u) => u());
}
