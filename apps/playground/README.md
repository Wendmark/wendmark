# Fika

A small coffee subscription shop that Wendmark is demoed and tested against.
It is a normal single-page app: no backend, no persistence, static data in
`src/data.ts`. It loads Wendmark the way a customer would, with one script tag
in `index.html`.

```bash
pnpm dev          # from the repository root: portal, Fika and the snippet
```

Fika runs on <http://localhost:5174>.

## Pages

| Page         | What it has                                                     |
| ------------ | --------------------------------------------------------------- |
| Shop         | Filter chips, search, sort, a grid of coffees                   |
| Coffee       | Size and grind options, quantity, add to cart                   |
| Cart         | A drawer with quantities                                        |
| Checkout     | Three steps: delivery, shipping, review                         |
| Subscription | Change-plan and pause dialogs                                   |
| Orders       | A table with expandable details                                 |
| Billing      | An embedded provider panel in a **cross-origin iframe** (below) |
| My tastings  | A dialog with a star picker                                     |
| Profile      | A form and notification switches                                |

## The cross-origin iframe fixture

**Billing** embeds a panel from "Ledgerly", a pretend billing provider
(`public/billing/panel.html`). It is loaded from the _other_ local host name
than the one Fika is on: open Fika on `localhost` and the panel comes from
`127.0.0.1`, and the other way round. Same server, but to a browser those are
different origins, so code in Fika's page cannot reach inside the frame.

That makes it the reproducible test case for recording and playing across
frames ([#89](https://github.com/Wendmark/wendmark/issues/89),
[#93](https://github.com/Wendmark/wendmark/issues/93)). A process that crosses
the boundary:

1. **Billing** in Fika's menu — Fika's own page
2. **Invoices** tab — inside the frame
3. **Download** on an invoice — inside the frame

The panel is plain HTML with no build step and no Wendmark snippet, as a real
provider's page would be. Vite listens on `127.0.0.1` (`vite.config.ts`) so
the one server answers to both names.
