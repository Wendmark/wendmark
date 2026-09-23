# Handing author mode to a customer's app

Decided 2026-09-23. Closes the question left open in the authentication
decisions: how the portal proves to an app that this person may record flows
for it.

## The problem

Two sites are involved, and the browser keeps them apart. The portal knows
who you are, because you are signed into it. The customer's app cannot read
that: a site never sees another site's cookies. So clicking **Record a
process** has to carry one fact across the gap:

> the person in this tab may author flows for this app

## What we chose

The portal opens the app in a new tab and sends the proof as a **message
between the two tabs**, not in the address.

```
1. Portal opens the app, keeping a handle on the new tab.

   PORTAL  ── window.open() ──▶  APP   https://app.example.com/profile#wm=author
                                       (a hint, not a secret)

2. The snippet sees the hint and asks its opener for credentials,
   addressing the portal's origin explicitly.

3. The portal checks the request came from an origin registered for that
   app, and replies to that tab alone with a short-lived token.

4. The snippet exchanges the token for an author session and clears the hint.
```

## Why not the alternatives

**A token in the URL fragment** is simpler, and it does keep the token out of
server logs. But everything running in the page can read the address, and
client-side error trackers routinely record `location.href` on every event —
so the token would end up in whatever logging service the customer uses. That
is a silent leak, which is the worst kind.

**An invisible portal frame** asking "who is this person?" is stronger still,
because there is no token to intercept: the answer comes from the portal's own
session cookie. Browsers increasingly block cookies for embedded sites, so it
needs the Storage Access API and a fallback anyway. Worth revisiting if the
message approach proves awkward.

## The ceiling, stated plainly

Any script running in the page can read what the page receives: the app's own
code, an analytics tag, a chat widget. No arrangement of messages or frames
changes that, because they all share one execution environment. Only a
browser extension runs somewhere the page cannot reach.

So the protection is in what a stolen token is worth, not in hiding it:

- **Drafts only.** An author session may create and edit drafts. Publishing
  happens in the portal, in a session an attacker does not have. The worst
  realistic outcome is a junk draft and an audit entry.
- **Sixty seconds, single use**, bound to one user, one app and one origin.
- **Audited**: who authored, which app, which origin, when.
- **Revocable**: rotating an app's key invalidates live author sessions.

## Consequences

- Author mode needs the snippet already installed in the app. An app we
  cannot add a script to needs a browser extension, which is a later option.
- The handshake lives behind `lib/auth/author-tokens.ts` on the server and one
  module in the snippet, so swapping the transport later is contained.
- The person must be signed into their own app already; the token only
  authorises saving to the portal.
