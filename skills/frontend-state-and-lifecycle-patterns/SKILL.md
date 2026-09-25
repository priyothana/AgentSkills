---
name: frontend-state-and-lifecycle-patterns
description: Manages frontend side effects, subscriptions, async requests, and cleanup across the lifecycle in React, Vue, Angular, Svelte, and other frameworks, and gives each value one owner. Use when writing effects such as useEffect, lifecycle hooks, watchers, or stores, fetching data inside a view, deciding whether API or server data belongs in a store such as Redux, Pinia, NgRx, or Svelte stores, or handling loading, error, and empty states and form drafts. Use when fixing race conditions where an older response overwrites newer search results, memory leaks from listeners never removed on unmount, stale values, infinite effect loops, or unnecessary re-renders.
---

# Frontend State and Lifecycle Patterns

## Overview

Most frontend bugs that survive review are state and timing bugs: a response for an old search overwriting a new one, a subscription left running after the component is gone, the same data held in two places that disagree, an effect that loops because a dependency changes every render. The concepts are the same in every framework even though the APIs differ. This skill names the concepts, gives each piece of state one owner, and makes every side effect start, update, and clean up deliberately.

`frontend-ui-engineering` covers component structure and has a quick table of where state can live; this skill covers how state and effects behave over time.

## When to Use

- Adding state, a store, a watcher, an effect, or a lifecycle hook
- Fetching data inside components, or adding subscriptions, timers, sockets, or event listeners
- Building forms with validation, dirty tracking, or async submission
- Fixing stale values, flicker, loops, leaks, race conditions, or slow re-renders

**When NOT to use:**

- Visual design, layout, or accessibility. Use `frontend-ui-engineering`.
- URL and navigation state design. Use `frontend-routing-and-navigation`.
- Measuring render performance. Use `performance-optimization`; this skill covers the state design that avoids waste.

## Process

### Step 1: Map the Concepts to the Framework

Identify the framework and the state tools already in the project. The concept-to-API mapping is in [Framework and Language Adaptation](#framework-and-language-adaptation).

Record which store, data-fetching library, and form library the project uses. Use them. Do not introduce a second state library for one feature.

### Step 2: Give Every Piece of State One Owner

For each value the feature needs, answer three questions:

1. **Is it derivable?** If it can be computed from other state or props, compute it. Do not store it and sync it with an effect. Full name from first and last name, filtered lists, totals, and validity are derived.
2. **Where does it come from?**
   - **Server state:** data owned by the backend (records, lists, the current user). It lives in the data-fetching layer or cache, not copied into component or global state.
   - **URL state:** shareable view state (filters, page, selected tab). It lives in the URL; see `frontend-routing-and-navigation`.
   - **Client state:** UI-only state (open menus, draft input, selection).
3. **Who needs it?** Keep client state in the lowest component that covers every reader. Lift it only when a sibling needs it, and move it to a shared store only when distant parts of the tree need it.

Never keep two copies of the same fact. If a component needs to edit server data, keep a draft copy explicitly named as a draft, and discard or submit it; do not keep "the data" in two places and hope they stay in sync.

### Step 3: Write Side Effects With a Start, Dependencies, and Cleanup

Every effect, watcher, or lifecycle hook that talks to the outside world answers:

```
EFFECT
Starts when:   [mount | these values change]
Depends on:    [every value it reads that can change]
Does:          [fetch | subscribe | timer | listener | DOM or third-party API]
Cleans up by:  [abort | unsubscribe | clear timer | remove listener | destroy instance]
```

- **Dependencies are complete.** An effect that reads a value but does not list it runs with a stale value. Follow the framework's lint rules; if a dependency causes loops, the fix is usually derived state or a stable reference, not omitting it.
- **Cleanup mirrors setup.** Every subscribe, `addEventListener`, `setInterval`, socket, observer, or third-party widget instance has a matching teardown that runs on unmount and before the effect re-runs.
- **Effects are for synchronizing with external systems.** Responding to a user event goes in the event handler. Computing values goes in derived state. An effect that only sets other state is usually a mistake.
- **No infinite loops.** An effect that updates a value in its own dependency list must check whether the value actually changed.

### Step 4: Handle the Async Lifecycle

Every async operation has four outcomes, and each needs UI:

```
status: idle → loading → success(data) | empty | error(reason)
```

- Render all of them: loading indicator, error with retry, empty state that says what to do, and the data. Designs for these states are in `frontend-ui-engineering`.
- **Prevent stale responses.** When inputs change while a request is in flight, cancel the old request (an abort signal or unsubscribe) or ignore its result by checking that it still matches the latest request. A slow response for an old query must never overwrite a newer one.
- **No updates after teardown.** Cleanup aborts in-flight requests so their results never land in an unmounted component.
- Prefer the project's data-fetching library, loader, or resource primitive over hand-written fetch-in-effect code; they handle caching, deduplication, cancellation, and revalidation.
- **Debounce** input-driven requests (search as you type), and **disable or deduplicate** submits so a double click does not send two requests.
- **Optimistic updates** keep the previous value and roll back on error.

### Step 5: Forms

- One source of truth per form: the form library's state, or a single object. Not one state variable per field mirrored into a second object.
- Track dirty, touched, submitting, and server-error state explicitly. Show validation at the time the codebase's pattern uses (on blur or on submit), and server errors next to the fields they concern.
- Initialize edit forms from server data once, when the data arrives, and do not overwrite the user's edits if the data refetches.
- Reset or discard drafts deliberately after submit, and wire the unsaved-changes guard described in `frontend-routing-and-navigation`.

### Step 6: Avoid Unnecessary Work

- Keep state as local as possible; state high in the tree re-renders everything below it.
- Split large shared stores or contexts so components subscribe only to the slices they read.
- Keep object and function references stable where they are dependencies or props of memoized children, using the framework's memoization primitives.
- Memoize expensive derived values, not every value. Measure before and after with `performance-optimization`; memoization without a measured problem adds complexity.
- Give list items stable keys from the data, never array indexes for lists that reorder.

### Step 7: Test State Over Time

- Test behavior through the rendered component: loading, then success, empty, and error states.
- **Race test:** issue two requests where the first resolves last, and assert the UI shows the second result.
- **Cleanup test:** unmount during an in-flight request or active subscription, and assert no further updates, errors, or listener calls.
- **Derived state test:** change the source and assert the derived value updates with no extra effect.

Follow `test-driven-development`, and write the failing race or cleanup test first when fixing such a bug.

## Decision Points

- **In Step 2: can the value be computed?** Yes → derive it and stop. No → classify it as server, URL, or client state.
- **In Step 2: who reads it?** One component → local. Siblings → the nearest common parent. Distant parts of the tree → a shared store or context, split by concern.
- **In Step 3: does this need an effect at all?** It responds to a user action → event handler. It computes a value → derived state. It synchronizes with something outside the framework → effect with cleanup.
- **In Step 4: does the project have a data-fetching library or route loader?** Yes → use it instead of fetch-in-effect. No → hand-write the fetch with cancellation and a stale-response guard, and note it as a candidate for a library.
- **In Step 6: is there a measured performance problem?** No → do not add memoization. Yes → fix state placement first, then memoize what the profile names.

## Framework and Language Adaptation

The concepts are the same everywhere. These are their names in each framework:

| Concept | React | Vue | Angular | Svelte |
|---|---|---|---|---|
| Local state | `useState`, `useReducer` | `ref`, `reactive` | component fields, `signal` | component `let` variables, `$state` |
| Derived state | compute during render, `useMemo` | `computed` | `computed` signal, pure pipe | `$:` reactive declarations, `$derived` |
| Side effect | `useEffect` | `watch`, `watchEffect`, `onMounted` | `effect`, `ngOnInit`, `ngOnChanges` | `onMount`, `$effect`, reactive statements |
| Cleanup | effect return function | `onUnmounted`, `onWatcherCleanup` | `ngOnDestroy`, `DestroyRef` | `onDestroy`, returned function from `onMount` |
| Stale-response guard | `AbortController` aborted in the effect's cleanup, or an `ignore` flag | `onWatcherCleanup` or the watcher's `onCleanup` argument | `switchMap` on the input stream, `takeUntilDestroyed` | Abort in the function returned from `$effect` |
| Shared state | context, store library | `provide`/`inject`, store library | injectable service with signals or observables | stores, context |
| Server state | the project's data-fetching library or loader | same | `HttpClient` with the project's caching approach | load functions, the project's library |

- **React StrictMode** mounts, unmounts, and remounts components in development, so effects run twice. That is a check that cleanup works, not a bug to suppress.
- **Svelte 4 and 5** differ: `$:` and stores in Svelte 4, runes (`$state`, `$derived`, `$effect`) in Svelte 5. Match the version and mode the component already uses.
- **Angular** apps may mix RxJS and signals. Keep a feature in one model, and convert at the boundary with `toSignal` or `toObservable`.
- **Other frameworks** (Solid, Preact, Lit, Qwik) map the same way. Find each concept's primitive before writing code.

## Common Mistakes

| Mistake | What happens | Fix |
|---|---|---|
| An object or array literal in a dependency list | The effect re-runs on every render | Depend on primitive fields, or memoize the object where it is created |
| Reading state in a timer or listener set up once | The callback sees the value from its first render forever | Use a functional update, a ref to the latest value, or re-subscribe when the value changes |
| Setting state from props on mount only | The component ignores later prop changes | Derive from props, or reset state with a key when the identity changes |
| Destructuring a reactive object (Vue `reactive`, Svelte 5 `$state` proxies) | The destructured variables lose reactivity | Use `toRefs`, or read the properties where they are used |
| Mutating store state outside its actions or reducers | Updates bypass devtools, subscriptions, and persistence | Change state only through the store's update API |
| A shared loading flag for several parallel requests | The first response to finish hides the spinner for the rest | Track status per request or per resource |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll store the filtered list in state and update it in an effect" | Derived state stored twice drifts and costs an extra render. Compute it. |
| "Copy the API response into the global store" | Now there are two caches to invalidate. Keep server state in the data-fetching layer. |
| "The request is fast, races won't happen" | On a slow network or a busy server they happen constantly. Cancel or ignore stale results. |
| "The component never unmounts" | Routes change, lists re-render, and tests mount and unmount. Clean up every effect. |
| "I left that dependency out to stop the loop" | Now the effect reads stale values. Fix the cause of the loop instead. |
| "Wrap everything in memo to be safe" | Memoization has costs and hides design problems. Apply it where measurement says it helps. |

## Red Flags

- An effect or watcher whose only job is to set other state from existing state
- Subscriptions, listeners, timers, or sockets without teardown
- Fetch in an effect with no cancellation and no stale-response check
- The same server data held in a component, a store, and a cache
- Suppressed dependency lint warnings
- Missing loading, error, or empty states
- Array indexes as keys for lists that reorder or filter
- A new state library added for one feature

## Verification

- [ ] Every new piece of state has one owner, and derivable values are computed, not stored
- [ ] Server state lives in the project's data-fetching layer, and shareable view state is in the URL
- [ ] Every effect lists complete dependencies and has cleanup that mirrors its setup
- [ ] Async operations render loading, success, empty, and error states
- [ ] Stale responses cannot overwrite newer ones, and nothing updates after unmount; show the race and cleanup tests passing
- [ ] Framework-specific APIs map to the concepts above and follow the project's existing libraries
- [ ] The full test suite passes

### Exit Criteria

- **Done:** every box above is checked, with the race and cleanup tests shown failing first for a bug fix and passing afterwards.
- **Done, with a follow-up:** the fix needs a data-fetching or state library the project does not have. Implement the minimal hand-written version that meets Step 4, and raise the library choice separately rather than adding it inside the feature.
