# Legacy prototype notes

Notes on the Chrome extension prototype ("Wend") in `./legacy`. It is kept for
reference only. **Do not port it**: we rebuild from these ideas, not this code.
`./legacy` is excluded from the workspace, lint, typecheck and formatting.

> Note: the prototype lived at the repository root. During scaffolding it was
> moved to `./legacy` with `git mv` (history kept, no content changes), along
> with its untracked `.env`, `dist/` and `node_modules/`.

## What it was

A Manifest V3 Chrome extension (Vite + `@crxjs/vite-plugin`, about 2,600 lines of TS)
that recorded a process in a web app and replayed it as on-screen guidance.
The core promise was already there: _"Wend never acts for you — it only
highlights."_

| Part           | File(s)                                    | Role                                                                                                      |
| -------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Content script | `src/content/index.ts`                     | Message router: play / stop / record start / record stop. Resumes playback or recording after navigation. |
| Recorder       | `src/content/recorder.ts`                  | Capture-phase `click` listener that captures a fingerprint per click, plus a "Recording" badge.           |
| Fingerprinting | `src/content/selector.ts`                  | Builds a selector and the other anchors (text, role, accessible name, classes, context).                  |
| Resolver       | `src/content/resolve.ts`                   | Multi-signal scoring to find the element again, plus a fuzzy URL match.                                   |
| Player         | `src/content/player.ts`                    | Step state machine: resolve, highlight, wait for the user's own click, advance.                           |
| Overlay        | `src/content/overlay.ts`                   | Shadow-DOM UI: highlight ring, animated cursor, draggable steps panel.                                    |
| AI "generator" | `src/generator/generate.ts`                | Popup calls Claude to turn raw clicks into named steps with instructions.                                 |
| AI "rescue"    | `src/background/index.ts`, `snapshot.ts`   | When the resolver fails, sends a snapshot of visible elements to Claude to pick one.                      |
| Popup / editor | `src/popup/*`, `src/editor/*`              | Record/play controls. A React options page for renaming and reordering steps.                             |
| Storage        | `processes.ts`, `recording.ts`, `state.ts` | All data in `chrome.storage.local`. No backend.                                                           |

Data model: `Process { id, name, steps: Step[] }`, where each `Step` is a bag of
anchors (`selector`, `text`, `role`, `name`, `classes`, `context`, `url`,
`dynamic`) plus a human `instruction`. There was only one kind of step: every
step had to point at an element.

## Worth reusing conceptually

### Element targeting (→ `@wendmark/dom`)

1. **A fingerprint is several independent anchors, not one selector.** The
   prototype recorded a selector, visible text, ARIA role, accessible name,
   "stable" classes, and the nearest section context (the closest `aria-label` or
   heading). This is the right shape for our fingerprint.
2. **Scored resolution with a threshold** (`resolveTarget`). Every candidate
   (from a selector match, or from a text/name match) is scored across all
   anchors. The winner must clear a minimum score. Ties go to the deepest
   element. Two details matter:
   - An exact text/name match (5) outweighs a selector match (4). A selector
     that matches an element whose text _disagrees_ is penalised (−2). A drifted
     structural path should never beat the element that says the right thing.
   - Text matching is bounded, so a large container can't match by
     containing the target's text.
3. **Stable-ID heuristics** (`isStableId`): reject ids that look generated
   (long digit runs, UUIDs, `ember…`/`react…`/`radix…`/`:r1:`, and UI5-style `__button42`).
   Classes that contain digits or `--` are treated as unstable. Prefer
   `data-testid`/`data-qa`/`data-cy` etc. when they exist.
4. **Shortest unique selector.** The selector is built upward from the target
   and stops as soon as it matches exactly one element. Shorter selectors
   survive markup changes better than fixed-depth paths.
5. **Shadow DOM awareness.** It walks up across shadow roots via `host` and
   queries into open shadow roots (`query-selector-shadow-dom`). We need the
   same reach, ideally without a dependency.
6. **Click-target climbing.** A click often lands on a `<span>` inside a
   `<button>`. The recorder climbs a few levels of `composedPath()` to the
   nearest interactive element.
7. **"Dynamic" (instance-data) targets.** Some steps target a data row ("the
   vessel you want"), not fixed UI. The prototype marked these as `dynamic`.
   It then highlighted every structurally similar element and advanced on a
   click on any of them. This is an important product idea to keep in the
   step model.
8. **Fuzzy URL preconditions.** Path segments that look like ids are treated as
   wildcards (`/vessel/123/orders` ≈ `/vessel/987/orders`). Hash routes are
   understood. A URL recorded at the origin root is treated as "anywhere on this
   origin". The URL is a hint for a "go to this page" message, not a hard gate.
9. **Privacy by construction.** `getVisibleText` returns `''` for
   inputs, textareas and selects, and never reads `.value` (except authored
   button captions on `<input type=submit>`). We keep this rule, and CLAUDE.md
   makes it binding.

### Cursor & guidance rendering (→ `@wendmark/snippet`)

1. **One host element, open shadow root, `all: initial`.** Host page CSS can't
   leak in, and our CSS can't leak out. Maximum `z-index`.
2. **`pointer-events: none` on the host.** Only the panel opts back in. The ring
   and cursor never intercept clicks, so the user clicks the real element
   _through_ the guidance. This is the mechanical form of "guide, never act".
3. **Advance on the user's own click.** A capture-phase `click` listener on
   the resolved target (`{ capture: true, once: true }`) lets the step register
   even when the click triggers a navigation.
4. **Cursor animation.** An SVG pointer glides in (CSS transition on
   `left/top`, ease-out cubic-bezier) from the bottom centre on first show,
   with a "tap" scale pulse, a ripple ring, and a "Click here" chip. The chip
   flips to the left near the right edge of the viewport. Movement is animated
   for a step change, and instant when tracking scroll or layout.
5. **Highlight ring** padded around the target's `getBoundingClientRect()`,
   with a soft glow animation.
6. **Target tracking.** Scroll/resize listeners plus a 250 ms position poll
   catch layout shifts that fire no events. If the target disappears for two
   consecutive polls, the step is re-resolved. This absorbs SPA re-renders
   without flicker.
7. **Retry cadence.** Six quiet retries at 500 ms ("Looking for this
   step…"), then a helpful blocked state (wrong page vs. wrong app state),
   with slow retries continuing. Guidance resumes on its own once the user
   gets there. Skip and Stop are always available.
8. **"Wrong element?"** lets the user reject a highlight for the current step.
   The element is excluded from resolution and the step is resolved again.
9. **Playback survives navigation** by persisting `{ flow, stepIndex }` before
   the click's navigation unloads the page.

## Weaknesses

- **Extension-only distribution.** It needed a per-customer build with host
  permissions hard-coded in `manifest.config.ts`, which included real customer
  domains. It was unusable for end users who won't install an extension. The
  new snippet runs in the page instead.
- **API key shipped in the client bundle.** `VITE_ANTHROPIC_API_KEY` was
  inlined into the extension build (`dangerouslyAllowBrowser: true`). Anyone
  with the build had the key. Never put secrets behind `VITE_` or
  `NEXT_PUBLIC_`.
- **No schema validation.** Steps were cast from `chrome.storage` and from LLM
  output with `as`, plus hand-written checks. Nothing versioned the format. We
  now use zod in `@wendmark/core` with a `schemaVersion`.
- **One step type.** Every step had to point at an element, so there was no way
  to say "read this". Now we have `action` and `instruction` steps.
- **Monolithic, untestable modules.** The resolver, fingerprinting, overlay and
  player all read `document`, `location` and `chrome.*` directly. Nothing was
  pure and there were no tests. The new split (`core` pure, `dom` taking a
  root, `snippet` for UI) exists to fix this.
- **Performance.** `resolveTarget` runs `querySelectorAllDeep('*')` on every
  attempt, calls `getComputedStyle` per candidate, and polls every 250 ms. On
  big pages this is expensive. `buildSelector` also runs a full deep query for
  every candidate segment during recording.
- **Selector brittleness.** The fallback path is `tag:nth-of-type()` chains.
  The descendant combinator used across shadow roots can over-match.
  "Stable class" detection is a rough regex.
- **Accessible-name computation is partial.** It ignores `aria-labelledby` across
  roots, `<label for>` in shadow trees, `alt` precedence and more. It also
  has a real bug: `el.labels?.[0]?.textContent?.trim() ?? …` never falls
  through on an empty string.
- **Global mutable state in storage.** Read-modify-write on
  `chrome.storage.local` needed a manual promise queue to avoid races.
  Recording, playback and panel position all shared one untyped key space.
- **Recorder only sees clicks.** It did not capture typing, selects, keyboard
  navigation or drag. "Fill in this field" steps could not be expressed
  (correctly, it never read values, but it also had no way to say _which_
  field without a click).
- **The LLM was on the critical path for authoring.** Raw clicks were unusable
  until `generate.ts` rewrote them. The LLM was asked to keep anchor fields
  "verbatim", which cannot be guaranteed.
- **Leftovers.** A hard-coded Wikipedia `TEST_PROCESS` is the default when
  "Play" gets no process. `console.warn` diagnostics are left in, and many UI
  strings are hard-coded.
