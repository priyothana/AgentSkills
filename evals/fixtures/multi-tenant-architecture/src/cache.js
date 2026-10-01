'use strict';

const store = new Map();

function remember(key, compute) {
  if (!store.has(key)) store.set(key, compute());
  return store.get(key);
}

function forget(key) {
  store.delete(key);
}

function clear() {
  store.clear();
}

module.exports = { remember, forget, clear };
