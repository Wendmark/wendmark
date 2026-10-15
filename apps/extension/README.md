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

| File                   | Runs in                     | What it does                                                    |
| ---------------------- | --------------------------- | --------------------------------------------------------------- |
| `public/manifest.json` | —                           | What the extension is and the permissions it asks for           |
| `src/background.ts`    | Chrome (the service worker) | Hears the toolbar click, injects the content script, sets badge |
| `src/content.ts`       | The page, isolated world    | Where the recorder and player will run                          |
| `src/messages.ts`      | Both                        | The messages between them, checked on arrival                   |

It runs on a page only when its icon is clicked (`activeTab`). There is no
`content_scripts` entry and no host permission at install;
`src/manifest.test.ts` fails if either appears.
