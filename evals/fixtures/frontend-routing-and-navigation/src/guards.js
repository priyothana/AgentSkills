'use strict';

// Redirects anonymous users to sign-in, remembering where they were going.
function requireSignIn(request) {
  if (!request.session || !request.session.user) {
    const returnTo = request.pathname + (request.search ? `?${request.search}` : '');
    return { status: 302, redirect: `/login?returnTo=${encodeURIComponent(returnTo)}` };
  }
  return null;
}

module.exports = { requireSignIn };
