# Security

## Reporting something

Please do not open a public issue.

Use GitHub's private vulnerability reporting on this repository:
**Security → Report a vulnerability**. It opens a private thread with the
maintainers and nothing is visible publicly until there is a fix.

Tell us what you found, how to reproduce it, and what you think it lets
someone do. If you are not sure whether something counts, report it anyway —
a wrong guess costs us a few minutes and the alternative costs more.

You will get an acknowledgement. If a report turns into a fix, you are
credited in the release notes unless you would rather not be.

## What is in scope

Wendmark is self-hosted, so "the service" is whatever you are running. What we
can fix is the code:

- **The portal** (`apps/portal`) — authentication, the author-mode pairing and
  tokens, the public `/api/v1` endpoints, anything that lets one organization
  see or change another's data.
- **The snippet** (`packages/snippet`) — anything that lets a page, or a
  process recorded by one app, affect a different app or its visitors.
- **The recorder** — anything that causes a value a user typed to be captured
  or stored. This is the one we would most want to hear about.

Out of scope: a Wendmark you have deliberately misconfigured (an origin
allowlist you opened to `*` by hand, a `DATABASE_URL` reachable from the
internet), and the usual automated-scanner findings on headers we do not set.

## What is already known, and deliberate

These are design decisions rather than oversights. The reasoning is in
[docs/decisions](docs/decisions).

**Author mode cannot be hidden from a determined user.** Any script running in
a page can read what that page receives — the app's own code, an analytics
tag, a chat widget. So the protection is in what a stolen author token is
worth, not in hiding it: drafts only, ninety seconds, single use, one app, one
origin, revoked when the app's key is rotated. Publishing happens in the
portal, in a session an attacker does not have. See
[docs/decisions/author-mode.md](docs/decisions/author-mode.md).

**The app's public key is not a secret.** It appears in a script tag on a
public page. It identifies an app; it authenticates nobody.

**Sessions are JWTs and cannot be deleted individually.** Revocation works by
bumping `user.sessionVersion`, which is read on every renewal. See
[docs/decisions/auth.md](docs/decisions/auth.md). **Known gap:** nothing in the
portal writes that column yet, so there is no "sign out everywhere" and no
bump on password change. The mechanism is in place; the trigger is not.

**Preflights echo the headers a browser asks for.** The snippet calls our
endpoints with the host page's `fetch`, which many apps have wrapped, so
requests arrive carrying headers we never asked for. No endpoint trusts a
header: callers are identified by `Origin` against the app's allowlist and by
a token in the body.

## If you run Wendmark

A few things worth knowing:

- `AUTH_SECRET` signs sessions. `pnpm bootstrap` generates one; if you set it
  by hand, make it random and keep it out of version control.
- The origin allowlist is what stops another site using your app's key. Keep
  it to addresses you control, and `https` everywhere but localhost.
- Rotating an app's key invalidates live author sessions, which is what you
  want if a key has leaked. Any page still serving the old tag loses guidance
  until it is updated.
- The database holds recorded processes: the structure of your pages and the
  labels your own designers wrote. It does not hold anything a user typed.
