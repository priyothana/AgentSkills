'use strict';

const DEFAULT_LOCALE = 'en';

function loadMessages(locale) {
  try {
    return require(`../locales/${locale}.json`);
  } catch {
    return {};
  }
}

// Looks up a message, falling back to the default locale.
function t(locale, key, params = {}) {
  const message = loadMessages(locale)[key] ?? loadMessages(DEFAULT_LOCALE)[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

module.exports = { t, DEFAULT_LOCALE };
