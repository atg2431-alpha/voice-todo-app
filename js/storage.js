/**
 * storage.js — LocalStorage helper functions
 * Provides a simple key-value store with JSON serialization.
 */

const Storage = (() => {
  /**
   * Retrieve a value from LocalStorage.
   * @param {string} key
   * @param {*} defaultValue - Returned when key is absent or data is corrupt.
   * @returns {*}
   */
  function get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`Storage.get: failed to parse key "${key}"`, e);
      return defaultValue;
    }
  }

  /**
   * Persist a value to LocalStorage as JSON.
   * @param {string} key
   * @param {*} value
   */
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Storage.set: failed to save key "${key}"`, e);
    }
  }

  /**
   * Remove a key from LocalStorage.
   * @param {string} key
   */
  function remove(key) {
    localStorage.removeItem(key);
  }

  return { get, set, remove };
})();
