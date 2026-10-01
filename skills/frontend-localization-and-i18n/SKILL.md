---
name: frontend-localization-and-i18n
description: Internationalizes and localizes frontend applications with translation keys, locale detection and switching, fallbacks, plural rules, locale-aware date, number, and currency formatting, time zones, and right-to-left layout. Use when adding a language or locale, translating a React, Next.js, Vue, Nuxt, Angular, or Svelte app, replacing hard-coded user-facing strings, formatting prices, dates, or times for a user's locale, or supporting Arabic or Hebrew RTL layouts. Use when translations are missing, fall back wrongly, or flash on server-rendered pages.
---

# Frontend Localization and i18n

## Overview

Internationalization bugs are cheap to prevent and expensive to find: a concatenated sentence that cannot be translated, a price formatted with the wrong separator, a date shifted by the server's time zone, a layout that breaks in right-to-left scripts. This skill makes every user-facing string, number, date, and direction pass through the locale layer, whatever framework or i18n library the project uses.

## When to Use

- Adding a new language, region, or locale to an app
- Building UI with user-facing text, dates, times, numbers, or prices in an app that is or will be localized
- Replacing hard-coded strings with translations
- Supporting right-to-left languages
- Fixing missing translations, wrong fallbacks, wrong formats, or hydration mismatches on localized pages

**When NOT to use:**

- Backend-only message catalogs with no frontend, although the formatting rules still apply
- General component, layout, or accessibility work. Use `frontend-ui-engineering`.

## Process

### Step 1: Find the Existing i18n Setup

Look for an i18n library in the dependencies, locale or messages directories, a translation function or component (`t()`, `$t`, a translate pipe, `<FormattedMessage>`, `{$_(...)}`), a locale setting in the framework's routing or config, and existing locale files. Record:

```
I18N MAP
Library / mechanism:   [name, or "none"]
Message files:         [path pattern, format (JSON, YAML, PO, XLIFF, ICU)]
Default locale:        [locale]    Supported: [list]
Locale source:         [URL segment, domain, cookie, user profile, browser]
Loading:               [bundled, lazy per locale, per route]
Rendering:             [client-only, server-rendered, static]
```

Use the existing library and conventions. If none exists and the app needs one, pick the framework's standard or most used option and record the choice with `documentation-and-adrs`. Do not add a second library.

### Step 2: Structure Keys and Messages

- **Keys describe meaning and location**, not English text: `checkout.summary.total`, not `"Total:"`. Group by feature or page, matching how the files are split.
- **Whole sentences with placeholders.** Never build a sentence by concatenating translated pieces; word order differs between languages. Use named placeholders: `"{name} invited you to {project}"`.
- **Plurals use the locale's plural rules**, through the library's plural syntax (ICU `plural`, or its equivalent). Languages have up to six plural forms; `count === 1 ? a : b` is wrong for many of them.
- Use `select` or gender forms where grammar depends on a value, instead of branching in code.
- Rich text (a link or bold word inside a sentence) uses the library's tag or component interpolation, not HTML strings concatenated in code.
- Give translators context: a description or comment for ambiguous keys, and screenshots or max lengths where space is tight.
- **Every user-facing string goes through the translation layer:** labels, placeholders, `alt` text, `aria-label`s, page titles, toasts, error and validation messages, and email or notification templates rendered by the frontend.

### Step 3: Locale Detection, Switching, and Fallback

- **Order of precedence** is explicit and documented, typically: locale in the URL, then the user's saved preference, then a cookie, then the browser's languages, then the default. Pick the order the app's routing supports.
- Match requested locales to supported ones with a negotiation step: `pt-BR` may fall back to `pt`, then the default.
- **Switching** updates the URL or stored preference, reloads the needed messages, and updates `lang` and `dir` on the document root. The user stays on the same page.
- **Fallback chain:** missing keys fall back through the regional locale, the base language, then the default locale. A missing key is logged in development and reported in CI; it never shows a raw key to users in production.
- Locale-prefixed URLs need hreflang links and a canonical URL on server-rendered sites.

### Step 4: Format Values With the Locale, Not by Hand

Use the platform's `Intl` APIs or the library's formatters, which wrap them:

| Value | Use | Never |
|---|---|---|
| Numbers | Locale number formatter | Hard-coded `.` or `,` separators, `toFixed` for display |
| Currency | Currency formatter with the currency code from the data | A `$` prefix in the template; the currency is data, the symbol position is locale |
| Percent, units | Percent and unit formatters | String concatenation with `%` or unit names |
| Dates and times | Date-time formatter with named styles (short, medium, long) | Hand-built `MM/DD/YYYY` strings |
| Relative time | Relative-time formatter | English-only "3 days ago" logic |
| Lists | List formatter | `join(', ')` with a translated "and" |
| Sorting | Locale-aware collation | Default code-point sort for names |

- **Time zones:** store and transmit instants in UTC or with an offset. Render in the user's time zone, which comes from their profile or the browser, and is passed explicitly to the formatter. Dates without times (birthdays, due dates) are plain calendar dates, not midnight instants, so they do not shift across time zones.
- Server-rendered pages must format with the same locale and time zone as the client, or render the value on one side only, to avoid hydration mismatches.

### Step 5: Right-to-Left Support

- Set `dir="rtl"` and `lang` on the document root, or on a subtree for mixed content, from the active locale.
- Use logical CSS properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`) instead of left and right.
- Mirror directional icons (arrows, back and forward chevrons) but not logos, media controls, or numbers.
- Isolate user-provided or mixed-direction text with `<bdi>` or `dir="auto"` so names and codes do not scramble surrounding punctuation.
- Test the whole flow in an RTL locale, not only one screen.

### Step 6: Validation Messages, Dynamic Content, and Loading

- Validation messages come from translation keys with parameters (`{min}`, `{max}`), shared by client and server, or the server returns error codes that the client translates. The server does not send English sentences for the UI to display.
- Content from a database or CMS (product names, articles) is localized in the data layer with per-locale fields or a content service. The UI translation files are only for UI strings.
- **Loading:** ship only the active locale's messages. Load other locales on switch, and split by route when message files are large. Keep formatters and locale data out of the main bundle when the library supports lazy loading. Bundle analysis is covered by `performance-optimization`.
- Server rendering loads the request's locale on the server and passes the same messages to the client, so the first render is already translated.

### Step 7: Test Localization

- **Missing and unused keys:** a check, in CI where possible, compares each locale file with the default locale and fails on missing keys.
- **Hard-coded strings:** a lint rule or search flags user-facing literals in components.
- **Pseudo-localization:** a pseudo-locale that lengthens and accents strings reveals untranslated text and layouts that break with longer languages.
- **Formatting tests:** assert numbers, currencies, dates, and plurals in at least two locales with different conventions, such as `en-US` and `de-DE`, plus plural edge counts (0, 1, 2, 5, 21).
- **RTL check:** render key screens in an RTL locale and review them, using `browser-testing-with-devtools` when available.

## Decision Points

- **After Step 1: is there an i18n mechanism?** Yes → use it. No, and the app is or will be localized → choose one, record an ADR, and add it in its own change before converting strings. No, and localization is out of scope → still keep new strings in one module, ready to extract.
- **In Step 2: is this text UI copy or content?** UI copy → translation files. Content from a database or CMS → the data layer (Step 6).
- **In Step 2: does the sentence vary by count, gender, or another value?** Yes → use plural or select syntax in one message, never branches in code.
- **In Step 4: is the value an instant or a calendar date?** Instant → store in UTC, render in the user's time zone. Calendar date → store and render as a date with no time zone conversion.
- **In Step 4: is the page server-rendered?** Yes → the server and client must use the same locale, messages, and time zone, or the value renders on one side only.
- **Before merge: does the missing-key check pass for every supported locale?** No → add the keys, or confirm and document the fallback.

## Framework and Language Adaptation

| Framework | Common libraries | Plural and select syntax | Notes |
|---|---|---|---|
| React | react-intl (FormatJS), react-i18next, Lingui | ICU (react-intl, Lingui); `_one` / `_other` key suffixes (i18next) | i18next's default suffixes follow `Intl.PluralRules`, so each locale file needs that locale's categories |
| Next.js | next-intl, or the React libraries | ICU (next-intl) | Load messages in server components or layouts, and pass only what client components need |
| Vue | vue-i18n | Pipe-separated forms (`car \| cars`) | The default plural choice is English-like. Configure `pluralRules` for languages with more forms, or use ICU through a formatter |
| Nuxt | @nuxtjs/i18n (wraps vue-i18n) | As vue-i18n | Provides locale routing, detection, and SEO tags; use them rather than hand-built equivalents |
| Angular | `@angular/localize` (built in), Transloco, ngx-translate | ICU in templates | `@angular/localize` builds one bundle per locale at compile time. Runtime switching needs a reload or a runtime library |
| Svelte / SvelteKit | Paraglide JS, svelte-i18n | Compiled message functions (Paraglide); ICU (svelte-i18n) | Set `lang` in `hooks.server` so SSR output carries it |
| Any | Platform `Intl` | `Intl.PluralRules` | `Intl.NumberFormat`, `DateTimeFormat`, `RelativeTimeFormat`, `ListFormat`, `Collator` cover Step 4 |

- Mobile and desktop frameworks (React Native, Flutter, native platforms) use platform locale APIs and resource files, but Steps 2 through 7 apply unchanged.
- Check that the runtime has full `Intl` locale data. Minimal ICU builds of Node.js, and older embedded engines, silently fall back to English formatting.

## Common Mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Reusing one key because the English text matches ("Open" as a verb and as a status) | Other languages need different words for each meaning | Separate keys by meaning, with translator comments |
| Formatting a number before passing it into a message | The message's own number formatting is bypassed, and plural selection sees a string | Pass the raw number and format it inside the message |
| Creating a new formatter object on every render | Slow rendering on long lists | Create formatters once per locale and reuse them |
| `new Date('2026-03-01')` for a due date | Parsed as UTC midnight, so it shows as February 28 in the Americas | Keep it as a plain date string, or use a date-only type |
| Storing only the translated label in the database or URL | Changing locale breaks filters, links, and comparisons | Store stable codes, translate at display time |
| Truncating text to a fixed character count | Cuts through grapheme clusters and breaks in other scripts | Truncate with CSS, or segment with `Intl.Segmenter` |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We only support English for now" | Strings hard-coded today are the migration project tomorrow. Routing them through keys costs almost nothing. |
| "`count === 1 ? 'item' : 'items'` is fine" | It is wrong for Arabic, Polish, Russian, and many others. Use the plural syntax. |
| "I'll concatenate the translated parts" | Word order changes between languages. Translators need the whole sentence. |
| "Format the price as `$` + amount" | The symbol, its position, separators, and decimals all depend on locale and currency. |
| "The server's time zone is fine for display" | Every user in another zone sees wrong times, and dates shift by a day. |
| "RTL is just `direction: rtl`" | Physical margins, icons, and mixed text break without logical properties and isolation. |

## Red Flags

- User-facing string literals in components, including `aria-label`, `alt`, `title`, and placeholders
- Sentences assembled from several translation keys or with `+`
- Manual plural logic or manual number, currency, or date formatting
- Keys that are English sentences, or raw keys visible in the UI
- `left`/`right` CSS in components that must support RTL
- Date-only values stored or parsed as midnight timestamps
- All locales bundled into the main bundle
- Server and client rendering localized values differently

## Verification

- [ ] The existing i18n mechanism was used, or one choice was made and recorded
- [ ] No hard-coded user-facing strings remain in the changed components; show the search or lint result
- [ ] New messages use whole sentences with named placeholders and locale plural rules
- [ ] Numbers, currencies, dates, and times use locale formatters with explicit time zone handling
- [ ] Every supported locale has the new keys, or the fallback chain is confirmed and missing keys are reported
- [ ] RTL locales set `dir`, and changed styles use logical properties
- [ ] Formatting and plural tests pass in at least two locales, and the suite passes

### Exit Criteria

- **Done:** every box above is checked, with the hard-coded-string search, the missing-key report, and locale test output as evidence.
- **Done, translations pending:** the keys exist in the default locale, and the other locales fall back correctly, show no raw keys, and are listed for translators. Say this explicitly in the handoff.
- **Blocked:** there is no i18n mechanism, and choosing one is outside the change. Report the options and stop before converting strings.
