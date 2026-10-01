---
name: frontend-routing-and-navigation
description: Structures client-side and server-rendered routes, route parameters, query strings, redirects, route guards, 404 and error routes, route-level data loading, and navigation behavior in any frontend framework. Use when adding a page, screen, or URL, nesting layouts, protecting a route for signed-in users or specific roles, handling not-found or error pages, making a view deep-linkable or back-button friendly, keeping filters in the URL, or warning about unsaved changes before navigating away. Works with React Router, Next.js, Vue Router, Nuxt, Angular Router, SvelteKit, and others.
---

# Frontend Routing and Navigation

## Overview

The URL is part of the interface. Users bookmark it, share it, reload it, and press Back, and every one of those must land them in the same state. Routing bugs are usually about what happens around the happy path: a deep link that crashes because data wasn't loaded, a protected page that flashes before redirecting, a filter lost on reload, a Back button that skips two screens. This skill organizes routes, guards, data loading, and navigation so they behave predictably in whatever router the project already uses.

## When to Use

- Adding or restructuring pages, screens, layouts, or URLs
- Adding parameters, query strings, or filters that should survive reload and sharing
- Protecting routes by sign-in state, role, or permission
- Adding not-found, error, or loading handling for routes
- Handling redirects, legacy URLs, or unsaved-change prompts

**When NOT to use:**

- Server-side API routing. Use `backend-application-architecture`.
- Component-level state that does not belong in the URL. Use `frontend-state-and-lifecycle-patterns`.

## Process

### Step 1: Identify the Router and Its Conventions

Find the router and how routes are declared: file-based (the directory structure is the route tree) or config-based (a route table). Record how the project does each of these, from an existing route:

```
ROUTER MAP
Router:            [name and version, or framework built-in]
Declaration:       [file-based dirs | route config file]
Layouts/nesting:   [how shared layouts wrap child routes]
Data loading:      [loader, server function, resolver, load function, or in-component fetch]
Guards:            [middleware, guard, beforeEach, loader redirect, wrapper component]
Not found / error: [special files, catch-all route, error boundary]
Rendering:         [client-only | SSR | static | mixed per route]
```

Follow these conventions. Use the router the project has; do not introduce another or build a custom one.

### Step 2: Design the Route Structure

- **URLs name resources and views**, in lowercase kebab-case, and nest where the UI nests: `/projects/:projectId/settings`.
- **Path parameters** identify the resource. **Query parameters** hold view state that is optional and shareable: filters, sort, page, tabs, search terms.
- **Nested routes** share layouts. Put shared navigation, data, and guards on the parent so every child inherits them.
- **Parse and validate parameters** at the route boundary. A non-numeric ID, an unknown tab, or an out-of-range page leads to a 404 or a normalized redirect, never to a crash deep in a component.
- Build links from route names or typed helpers where the router supports them, rather than hand-concatenated strings, so renamed routes fail at build time.
- Use real links (anchor elements rendered by the router's link component) for navigation, so middle-click, open-in-new-tab, and screen readers work. Reserve programmatic navigation for after actions such as saving a form.

### Step 3: Guard Routes Without Trusting Them

- **Authentication-aware routing:** routes that need a signed-in user redirect anonymous visitors to sign-in with a return-to parameter, then send them back after sign-in. Validate the return-to value as a same-site path to avoid open redirects.
- **Authorization-aware routing:** routes needing a role or permission check it before rendering, using the same permissions the server reports. Send users who lack access to a forbidden page, not to a blank screen.
- **Guards are UX, not security.** Every protected route's data comes from an API that enforces the same rule on the server. Authorization design is covered by `application-rbac-and-authorization`.
- Run guards before the protected content renders. On server-rendered routes, redirect on the server so protected markup is never sent. On client-only apps, render a loading state until the session is known, so protected content never flashes.
- Put shared guards on a parent route or layout, not repeated on each child.

### Step 4: Load Data at the Route Level

- Load a page's primary data through the router's data-loading mechanism when it has one, so the data starts loading with navigation instead of after the component mounts.
- **Every route has a loading, error, and not-found state.** A missing resource returns the not-found page, with a 404 status on server-rendered pages. A failed load shows the route's error UI with a retry, and the rest of the app keeps working.
- **Cancel or ignore stale loads.** A fast second navigation must not be overwritten by the first navigation's slower response. Most routers do this in their loaders; in-component fetching needs the rules in `frontend-state-and-lifecycle-patterns`.
- Keep route-level loading focused on data needed for first render. Secondary data loads inside the page.
- Split code per route so each page's code downloads on navigation. Bundle concerns are covered by `performance-optimization`.

### Step 5: Not-Found, Error, and Redirect Routes

- A catch-all route renders a not-found page with navigation back into the app. Server-rendered 404s return a 404 status.
- An error boundary at the route or layout level catches rendering and loading errors, so one broken page does not blank the whole app.
- Permanent URL changes redirect old paths to new ones and keep parameters and query strings. On server-rendered sites, use a permanent server redirect.
- Redirects never loop. Guards that redirect check they are not already on the target.

### Step 6: History, Deep Links, and Unsaved Changes

- **Deep linking:** every meaningful view is reachable by URL alone, in a fresh tab, signed in or after sign-in. Test by pasting the URL, not by clicking there.
- **Back and forward:** navigating between views pushes history entries. Updating a filter or a text search replaces the current entry instead of adding one per keystroke. Back returns to the previous view with its filters, and scroll restoration uses the router's mechanism.
- **Focus and announcement:** after navigation, move focus to the main heading or content, and update the document title, so keyboard and screen-reader users know the page changed. See `frontend-ui-engineering` for the accessibility baseline.
- **Unsaved changes:** forms with unsaved edits register a navigation guard that asks before in-app navigation, and a browser `beforeunload` prompt for reloads and tab closes. Remove both once the form is saved or discarded, so they never block normal navigation.

### Step 7: Test the Routes

- Direct entry to each new URL, signed out and signed in, with valid and invalid parameters.
- Guards: an anonymous user is redirected to sign-in and returned afterwards; a user without the permission gets the forbidden page; the protected content never renders for them.
- Not-found: an unknown path and an unknown resource ID both show the not-found page.
- History: Back after navigating and after changing a filter goes where the user expects.
- Unsaved changes: the prompt appears with edits and does not appear after saving.

Use the project's component or end-to-end tests. For checks in a real browser, use `browser-testing-with-devtools`.

## Decision Points

- **In Step 2: path or query parameter?** It identifies the resource → path. It is optional, shareable view state → query. It is private or transient (an open menu, a draft) → component state, not the URL.
- **In Step 2: push or replace?** A new view the user would go Back to → push. A refinement of the same view (filter, sort, typing) → replace.
- **In Step 3: where does the guard run?** Server-rendered route → on the server, before markup is sent. Client-only → before render, with a loading state until the session is known.
- **In Step 3: which response when access fails?** Not signed in → sign-in with a validated return-to. Signed in without permission → the forbidden page. A resource the user must not know exists → not-found.
- **In Step 4: route loader or in-page fetch?** Needed for first render → the route's loader. Secondary or below the fold → inside the page.
- **In Step 5: does a URL change break existing links?** Yes → add a permanent redirect that keeps parameters.

## Framework and Language Adaptation

| Concern | React Router (data routers) | Next.js App Router | Vue Router / Nuxt | Angular Router | SvelteKit |
|---|---|---|---|---|---|
| Declaration | Route objects or file routes | `app/` directories, `page.tsx` | Route table / `pages/` directory | `Routes` array | `src/routes` directories, `+page.svelte` |
| Layouts | Parent route with `<Outlet>` | `layout.tsx` | Nested routes with `<RouterView>` / `layouts/` | Child routes with `<router-outlet>` | `+layout.svelte` |
| Data loading | `loader` | Async server components, route handlers | Guards or in-page fetch / `useFetch`, `useAsyncData` | `resolve`, or in-component fetch | `load` in `+page.ts` / `+page.server.ts` |
| Guards | `loader` that throws `redirect()` | `middleware.ts` (`proxy.ts` in Next.js 16+), plus checks in the page or layout | `beforeEach`, `beforeEnter` / route middleware | `canActivate`, `canMatch` | `load` that throws `redirect()`, `hooks.server` |
| Not found | Catch-all `*` route | `not-found.tsx`, `notFound()` | `/:pathMatch(.*)*` / `error.vue` with 404 | `**` wildcard route | `error(404)`, `+error.svelte` |
| Error UI | `errorElement` / `ErrorBoundary` | `error.tsx` | `onErrorCaptured` / `error.vue` | `ErrorHandler`, error route | `+error.svelte` |
| Unsaved changes | `useBlocker` | `beforeunload` plus link interception | `onBeforeRouteLeave` | `canDeactivate` | `beforeNavigate` |

- **Next.js middleware** runs on every matched request and is not the only line of defense. Check sessions in the server component, action, or route handler that reads the data as well.
- **File-based routers** make the directory the API. Renaming a folder is a URL change and needs the redirect from Step 5.
- **Hash routing** (`#/path`) is invisible to the server, so server redirects and status codes do not apply. Handle not-found on the client, and prefer history routing when the host supports it.
- Mobile navigation libraries (React Navigation, Expo Router, Flutter's router) use stacks instead of URLs, but deep links, guards, and not-found handling still apply through their linking configuration.

## Common Mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Reading query parameters as the right type without parsing | `?page=abc` produces `NaN`, and `?page=2` compares as the string `"2"` | Parse and validate with defaults at the route boundary |
| A guard that awaits the session on every navigation without caching | Every click waits on a network round trip | Resolve the session once and reuse it, refreshing on expiry |
| Redirecting to sign-in with the full URL as return-to, unencoded | Query strings are lost or split into separate parameters | Encode the path and query, and validate them as same-site on return |
| Scroll restored before the route's data has rendered | The page jumps to the top or to the wrong position | Use the router's scroll restoration, which waits for the data |
| A layout that fetches data that each child route also fetches | Duplicate requests on every navigation | Load shared data once in the parent and read it in the children |
| Relative links (`href="settings"`) inside nested routes | They resolve differently depending on the trailing slash and nesting depth | Use named routes or absolute paths from helpers |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Keep the filters in component state, it's simpler" | Then reload, sharing, and Back all lose them. Shareable view state belongs in the URL. |
| "The guard hides the page, so it's protected" | Anyone can call the API the page uses. The server must enforce the same rule. |
| "Nobody will open that page directly" | Bookmarks, shared links, and reloads all do. Every route must work from a cold start. |
| "A blank page is fine for missing data" | Users can't tell a missing record from a broken app. Render not-found and error states. |
| "Use navigate() in an onClick for links" | Users lose open-in-new-tab and assistive tech loses the link role. Use real links. |
| "Push a history entry for every keystroke in search" | Back then walks through every character. Replace the entry instead. |

## Red Flags

- Protected content that renders briefly before a redirect
- Route parameters used without parsing or validation
- Filters, pagination, or tabs that reset on reload
- Links implemented as click handlers on non-link elements
- No catch-all not-found route, or a 404 page returning status 200 on server-rendered sites
- A return-to redirect that accepts any URL
- An unsaved-changes prompt that fires after saving or on every navigation
- A second routing library or hand-built router alongside the project's router

## Verification

- [ ] The project's router and conventions were identified and followed
- [ ] New URLs are deep-linkable: each loads correctly from a fresh tab, including after sign-in
- [ ] Parameters are validated; invalid values lead to not-found or a normalized redirect
- [ ] Guards redirect before protected content renders, and the server enforces the same rules
- [ ] Each new route has loading, error, and not-found states
- [ ] Back and forward behave as expected, and shareable view state is in the URL
- [ ] Route tests cover direct entry, guards, not-found, and history; show them passing

### Exit Criteria

- **Done:** every box above is checked, with each new URL opened directly in a fresh session as evidence (test output or a browser check).
- **Blocked:** a protected route's API does not enforce the same rule on the server. Report it, and do not treat the client guard as the fix. Hand off to `application-rbac-and-authorization`.
