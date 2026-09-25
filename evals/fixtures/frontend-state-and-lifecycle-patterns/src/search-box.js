'use strict';

const { createComponent } = require('./component');

// Search results for props.query.
// deps.search(query, { signal }) returns a Promise of an array of { id, name }.
// deps.catalogEvents notifies when the catalog changes, so results are refreshed.
function createSearchResults(props, deps) {
  function load(ctx) {
    ctx.setState({ loading: true });
    deps.search(ctx.props.query).then((results) => {
      ctx.setState({ loading: false, results, count: results.length });
    });
  }

  return createComponent({
    props,
    state: { loading: false, results: [], count: 0 },
    render: ({ state }) => {
      if (state.loading) return '<p>Loading…</p>';
      return `<p>${state.count} results</p><ul>${state.results.map((r) => `<li>${r.name}</li>`).join('')}</ul>`;
    },
    onMount(ctx) {
      load(ctx);
      deps.catalogEvents.subscribe(() => load(ctx));
    },
    onUpdate(ctx, prev) {
      if (ctx.props.query !== prev.query) load(ctx);
    },
  });
}

module.exports = { createSearchResults };
