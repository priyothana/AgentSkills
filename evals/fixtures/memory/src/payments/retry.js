'use strict';

const BASE_DELAY_MS = 200;
const MAX_ATTEMPTS = 5;

async function withRetry(charge, sleep) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await charge();
    } catch (err) {
      lastError = err;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastError;
}

module.exports = { withRetry, BASE_DELAY_MS, MAX_ATTEMPTS };
