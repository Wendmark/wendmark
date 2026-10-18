# Chrome Web Store listing

What goes into each field of the Chrome Web Store developer dashboard, ready
to paste. Keep it in step with what the extension does: the review checks the
listing against the code.

The package: `pnpm --filter @wendmark/extension package`, which writes
`release/wendmark-chrome-<version>.zip`.

---

## Store listing

**Name** (from the manifest): `Wendmark`

**Summary** (132 characters at most; this is the manifest's description):

> Show someone how to do something in a web app: record the clicks once, share a link, and they are guided through it.

**Category:** Productivity → Workflow & Planning

**Language:** English

**Description:**

```
Show someone how to do something in a web app, and let them do it themselves.

Record a few clicks in any web app, then share a link. Whoever opens it is guided through the same steps in their own signed-in session: a cursor points at each thing to click, and moves on when they have clicked it. They do every click themselves. Wendmark only ever shows the way.

Made for the small "here's how" moments:
• showing a colleague how to reproduce a bug
• walking a teammate through a feature they use once a month
• explaining a few clicks in a tool neither of you built

HOW IT WORKS
1. Click the Wendmark icon on a page and press Record a process.
2. Click through it as you normally would. Each click becomes a step.
3. Press Prepare to share. You see exactly what will be sent, with the words from the page taken out by default. Leave out any step, or add a note.
4. Copy a link, copy the steps as text, or save a file.
5. Your colleague opens the link, presses Start, allows that one site, and follows the pointer.

PRIVATE BY DESIGN
• Nothing runs until you ask: on a page only when you click the icon, or on a site only when you start a guide and allow it. Wendmark never asks for access to all websites.
• Nothing you type is ever recorded. Guides are made of what was clicked, never of anything typed into a field.
• No account and no server. Your guides stay in your browser. A shared guide travels inside its link, after the #, which browsers never send to any server.
• No analytics, no tracking, no ads.

Open source under the Apache 2.0 licence: https://github.com/Wendmark/wendmark
More: https://wendmark.dev/extension/
```

**Images** (in `store/images/`):

| Field                     | File                               |
| ------------------------- | ---------------------------------- |
| Store icon, 128×128       | `public/icons/icon-128.png`        |
| Screenshots, 1280×800     | `store/images/screenshot-1..4.png` |
| Small promo tile, 440×280 | `store/images/promo-small.png`     |

The screenshots are captures of the real extension, at twice the size and
scaled down, laid out with a headline each. Retake them when the interface
changes: the review compares the listing with what the extension does.

**Official URL / homepage:** https://wendmark.dev/extension/
**Support URL:** https://github.com/Wendmark/wendmark/issues

---

## Privacy practices

**Single purpose:**

> Wendmark records the steps of a process in a web app as a guide, and shows a person how to follow a guide by pointing at each step while they click.

**Permission justifications:**

- **activeTab**: When the person clicks the Wendmark toolbar icon, Wendmark runs on that tab only, to record the steps they click there. It has no access to any page until that click.
- **scripting**: Wendmark puts its recorder and guide pointer into the page the person chose, by injecting its own content script after they click the icon or start a guide. It never injects into a page they did not choose.
- **sidePanel**: The side panel lists the person's guides for the current site, with Record, Play, Share and Import.
- **storage**: Guides are kept locally in the browser (chrome.storage.local), and the guide being recorded or played is kept for the tab (chrome.storage.session), so a page load does not lose it. Nothing is sent anywhere.
- **Host permission (optional, requested per site at runtime):** When the person starts a guide for a site, Wendmark asks for access to that one site, from a click, so it can point at each step there as they move between pages. It never requests all sites, and does nothing on a site until a guide for it is started.

**Remote code:** No, I am not using remote code. All code is in the package.

**Data usage:** Wendmark does **not** collect or transmit any user data. Tick none of the data categories. Then certify all three statements:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://wendmark.dev/privacy/

---

## Distribution

**Visibility:** start with **Unlisted** (only people with the link can install it), try it, then switch to **Public**.

**Regions:** all regions.

## After the first upload

The store's id for Wendmark is **`lpkmodjgcejabaikcifkfhnmpdigpipb`**
(listing: https://chromewebstore.google.com/detail/lpkmodjgcejabaikcifkfhnmpdigpipb,
live once approved). It differs from the development id in the manifest's
`key`. Add it to `EXTENSION_IDS` on the play page
(Wendmark/wendmark.dev, `src/pages/play.astro`), and point the `/extension/`
page's install button at the store listing.
