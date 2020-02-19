/**
 * Naive implementation of a multi-key cache.
 */
export default function createMultiKeyCache() {
  let cache = new Map();
  return {
    get,
    set,
    remove
  };

  function get(keys) {
    if (!keys) return;
    let lastCache = cache;
    let entry;
    for (let i = 0; i < keys.length; ++i) {
      let key = keys[i];
      entry = lastCache.get(key);
      if (!entry) return;
      lastCache = entry;
    }
    return entry;
  }

  function set(keys, value) {
    let lastCache = cache;
    for (let i = 0; i < keys.length - 1; ++i) {
      let key = keys[i];
      let entry = lastCache.get(key);
      if (!entry) {
        entry = new Map();
        lastCache.set(key, entry);
      }
      lastCache = entry;
    }
    lastCache.set(keys[keys.length - 1], value);
  }

  function remove(keys) {
    let lastCache = cache;
    for (let i = 0; i < keys.length - 1; ++i) {
      let key = keys[i];
      let entry = lastCache.get(key);
      if (!entry) return;
      lastCache = entry;
    }
    lastCache.delete(keys[keys.length - 1]);
    // TODO: Might also want to remove parent elements if this was the last entity.
  }
}
