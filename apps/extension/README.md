# Wendmark for Chrome

A Chrome extension for showing someone how to do something in a web app,
without a portal or an install in that app. See
[docs/decisions/browser-extension.md](../../docs/decisions/browser-extension.md)
for what it is for and why it is built this way.

Licensed under Apache-2.0, like the snippet it shares its engine with.

## Try it

```bash
pnpm --filter @wendmark/extension build
```

Then in Chrome, open `chrome://extensions`, switch on **Developer mode**,
press **Load unpacked** and choose `apps/extension/dist`. After a rebuild,
press the reload arrow on the extension's card.

`pnpm --filter @wendmark/extension dev` rebuilds on every change.

## How it is put together

| File                   | Runs in                     | What it does                                                         |
| ---------------------- | --------------------------- | -------------------------------------------------------------------- |
| `public/manifest.json` | —                           | What the extension is and the permissions it asks for                |
| `src/background.ts`    | Chrome (the service worker) | Toolbar click: opens the side panel, injects the content script      |
| `src/content.ts`       | The page, isolated world    | The recorder and player, from `@wendmark/snippet/engine`             |
| `src/sidepanel.ts`     | The side panel              | Guides for the current site; Record, Pin, Delete                     |
| `src/guides.ts`        | Anywhere                    | Guides in `chrome.storage.local`, tidied after 30 days unless pinned |
| `src/tabs.ts`          | Worker, side panel          | Per-tab state in `chrome.storage.session`: the site, a recording     |
| `src/share.ts`         | Side panel                  | Exactly what sharing sends: steps left out, masking, notes           |
| `src/messages.ts`      | All of them                 | The messages between them, checked on arrival                        |

### Recording a guide

1. Click the Wendmark icon on the page. The side panel opens, and the
   content script is injected into that tab.
2. Press **Record a process** in the side panel. The recorder panel appears
   on the page, the same one the portal's author mode uses.
3. Click through the process. If the page reloads, the recording is kept;
   click the icon again to carry on (the extension's access to a tab ends
   when it navigates, and only a click grants it again).
4. Name it and press **Save**. It is kept in this browser, listed in the
   side panel, for 30 days unless pinned.

### Before anything is shared

**Prepare to share** on a guide shows exactly what would leave the browser,
from the same function sharing uses. By default it is **structure only**: the
words on the page come off every step, as in problem reports. Any step can be
left out, and any step can carry a note, since nothing anyone types is ever
recorded.

It runs on a page only when its icon is clicked (`activeTab`). There is no
`content_scripts` entry and no host permission at install;
`src/manifest.test.ts` fails if either appears.
