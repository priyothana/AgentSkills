'use strict';

// APP_ENV is one of: development, test, staging, production.
function appEnv(env = process.env) {
  return env.APP_ENV;
}

module.exports = { appEnv };
