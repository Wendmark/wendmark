# Writing a flow by hand

Until the recorder exists, flows are written by hand. This is also how you try
Wendmark on an app other than Fika.

## 1. Load the snippet

Serve it with `pnpm dev` (the portal serves it at `http://localhost:3000/snippet.js`),
then add one tag to the app you want to guide:

```html
<script src="http://localhost:3000/snippet.js"></script>
```

For an app you cannot edit, paste the contents of `apps/portal/public/snippet.js`
into the browser console instead. Either way you end up with one global,
`window.Wendmark`.

## 2. Capture fingerprints by clicking

Paste this into the console of the app, then click through the process once.
It records nothing but structure and authored labels — never what you type.

```js
const captured = []
const capture = (event) => {
  const target = Wendmark.findInteractiveTarget(event.target)
  captured.push(Wendmark.fingerprint(target))
  console.log(JSON.stringify(captured, null, 2))
}
document.addEventListener('click', capture, { capture: true })

// when you are done:
// document.removeEventListener('click', capture, true)
```

Each entry is a `target` for a step.

## 3. Assemble the flow

```js
const flow = {
  schemaVersion: 1,
  id: 'change-grind',
  name: 'Change your grind to Espresso',
  steps: [
    {
      type: 'action',
      id: 'open-profile',
      text: 'Open your Profile', // what the user is told; you write this
      dynamic: false,
      target: {/* paste a captured fingerprint here */},
    },
    { type: 'instruction', id: 'pick', text: 'Choose Espresso from the list.' },
  ],
}
```

Rules worth knowing:

- **`text` is yours to write.** The fingerprint describes the element; the
  step's `text` is what the user reads.
- **`dynamic: true`** when the target is one of the user's own items (an order,
  a coffee, a row) rather than fixed UI. The player then highlights the whole
  group and lets the user choose.
- **Instruction steps have no target.** Use them for "read this" or "type your
  details, then continue".
- **Less can be more.** `role` plus `name` often resolves better than a long
  selector, because it survives restyling. Trim anything that looks generated.

## 4. Play it

```js
Wendmark.start(flow)
Wendmark.stop()
```

If a step cannot be found, the panel says so and keeps looking; navigate to the
right screen and guidance resumes by itself.

## Where flows live today

| Where                                   | What                                                     |
| --------------------------------------- | -------------------------------------------------------- |
| `apps/playground/src/wendmark/flows.ts` | Fika's demo flow, loaded by the "Guide me" button        |
| Anywhere else                           | A `const` in a console session, or a JSON file you paste |

Storage, an editor and publishing come with the portal, after the course.
