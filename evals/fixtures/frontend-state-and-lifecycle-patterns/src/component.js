'use strict';

// The app's minimal component runtime.
// A component has state, a render function, and lifecycle hooks:
//   mount()   -> calls onMount(ctx)
//   update(p) -> calls onUpdate(ctx, prevProps)
//   unmount() -> calls onUnmount(ctx)
// ctx.setState(patch) merges state and re-renders; after unmount it logs an error.
function createComponent({ props = {}, state = {}, render, onMount, onUpdate, onUnmount }) {
  const ctx = { props, state: { ...state }, html: '', mounted: false, errors: [] };
  ctx.setState = (patch) => {
    if (!ctx.mounted) {
      ctx.errors.push('setState called on unmounted component');
      return;
    }
    ctx.state = { ...ctx.state, ...patch };
    ctx.html = render(ctx);
  };
  return {
    ctx,
    mount() {
      ctx.mounted = true;
      ctx.html = render(ctx);
      if (onMount) onMount(ctx);
    },
    update(nextProps) {
      const prev = ctx.props;
      ctx.props = { ...ctx.props, ...nextProps };
      ctx.html = render(ctx);
      if (onUpdate) onUpdate(ctx, prev);
    },
    unmount() {
      if (onUnmount) onUnmount(ctx);
      ctx.mounted = false;
    },
  };
}

module.exports = { createComponent };
