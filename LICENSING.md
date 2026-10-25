# Licensing

Copyright © 2026 the Wendmark contributors.

Wendmark is released under **two** licences, chosen for where each part of it
ends up running.

| Path               | Licence        | Why                                      |
| ------------------ | -------------- | ---------------------------------------- |
| `packages/core`    | **Apache-2.0** | Ships inside other companies' products   |
| `packages/dom`     | **Apache-2.0** | Ships inside other companies' products   |
| `packages/snippet` | **Apache-2.0** | Ships inside other companies' products   |
| `apps/portal`      | **AGPL-3.0**   | The part someone could host as a service |
| `apps/playground`  | **AGPL-3.0**   | Demo app for the portal                  |
| `apps/extension`   | **Apache-2.0** | Built from the snippet's engine          |
| Everything else    | **AGPL-3.0**   | Repository default                       |

The root [`LICENSE`](LICENSE) is the AGPL, and it covers the repository unless
a directory has a `LICENSE` of its own saying otherwise. Each package also
declares its licence as an SPDX identifier in its `package.json`.

## Why two

**The snippet is embedded in someone else's website.** A customer pastes
`snippet.js` into their own product, which they did not write and we do not
own. Putting a network-copyleft licence on that file would oblige every one of
those companies to work out what it means for their application, and most
would reasonably decline. Apache-2.0 removes the question, and its patent
grant is what makes a legal department comfortable.

**The extension is built from the same engine.** It bundles core, dom and the
snippet, so it takes their licence: one set of terms for the code that runs in
other people's pages, whichever way it arrives.

**The portal is the part worth taking.** It is a complete product: record,
edit, publish, serve. AGPL-3.0 means anyone may run it, change it and deploy
it — and if they run a modified copy as a service for other people, they
publish those modifications. That is the whole intent: improvements to a
hosted Wendmark come back.

## What this means for you

**Using Wendmark in your own product.** Install the portal, paste the snippet,
and you are done. Nothing is asked of your own application's source. The AGPL
is about distributing or hosting _the portal_, not about the software you
document with it.

**Modifying the portal for your own use.** Fine, and nothing is required of
you, as long as you are not offering it to other people over a network.

**Hosting a modified portal as a service.** Then AGPL section 13 applies: the
people using it must be able to get your modified source.

**Contributing.** Your contribution carries the licence of the directory it
lands in. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Third-party media

The music in [`docs/images/intro.mp4`](docs/images/intro.mp4) is "Happy
Beats / Business Moves Vol. 12" by Sascha Ende ([ende.app](https://ende.app/en)),
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). It is not
covered by the AGPL; the rest of the video is. Credit it as "Music: Sascha
Ende, ende.app (CC BY 4.0)" wherever the video is shown.

## Paid features, if they ever exist

Any commercial features would live in their own directory under their own
licence, clearly marked, and everything documented here stays as it is. There
is no contributor licence agreement, and none is planned: contributions stay
under the licence they arrived under, which means they cannot quietly become
proprietary later.

## Not legal advice

This file explains an intent. It is not a legal opinion, and neither the
licence texts nor this summary have been reviewed by a lawyer.
