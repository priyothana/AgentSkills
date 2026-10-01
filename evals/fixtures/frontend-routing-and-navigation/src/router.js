'use strict';

// The app's router. Each route has a path pattern (":name" segments are params),
// an optional list of guards, an optional load function, and a view.
// resolve() returns one of:
//   { status: 200, view, params, query, data }
//   { status: 302, redirect }
//   { status: 403, view: 'forbidden' }
//   { status: 404, view: 'not-found' }

function compile(path) {
  const names = [];
  const regex = new RegExp(
    '^' + path.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '/?$'
  );
  return { regex, names };
}

function createRouter(routes) {
  const compiled = routes.map((r) => ({ ...r, ...compile(r.path) }));

  function resolve(url, ctx) {
    const { pathname, searchParams } = new URL(url, 'http://app.local');
    const query = Object.fromEntries(searchParams);
    for (const route of compiled) {
      const m = pathname.match(route.regex);
      if (!m) continue;
      const params = Object.fromEntries(route.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      const request = { pathname, search: searchParams.toString(), params, query, ...ctx };
      for (const guard of route.guards || []) {
        const outcome = guard(request);
        if (outcome) return outcome;
      }
      const data = route.load ? route.load(request) : undefined;
      if (data && data.notFound) return { status: 404, view: 'not-found' };
      return { status: 200, view: route.view, params, query, data };
    }
    return { status: 404, view: 'not-found' };
  }

  return { resolve };
}

module.exports = { createRouter };
