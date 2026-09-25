'use strict';

// Background catalog refresh notifications.
function createCatalogEvents() {
  const listeners = new Set();
  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit() {
      for (const fn of listeners) fn();
    },
    listenerCount: () => listeners.size,
  };
}

module.exports = { createCatalogEvents };
