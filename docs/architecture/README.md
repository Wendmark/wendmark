# How Wendmark is built

Five documents, each covering one area, in the order they make sense to read.
They explain _why_ the code looks the way it does — the constraints that
shaped it and the attempts that failed — which is the part source code cannot
tell you on its own.

1. [The shape of the portal](01-portal-shape.md) — layers, the `ctx` object,
   permissions, and two conventions that explain a lot of the code
2. [Auth](02-auth.md) — first-run setup, passwords, JWT sessions and how
   revocation works without a session table
3. [Apps](03-apps.md) — public keys, the origin allowlist, the install ping
4. [Author mode](04-author-mode.md) — pairing, why window messaging failed,
   and why there are two snippet bundles
5. [Flows](05-flows.md) — the shared schema, the zod problem, saving and
   listing

The rules these follow — guide never act, the dependency table, the snippet's
constraints — are in [CLAUDE.md](../../CLAUDE.md). Decisions with alternatives
weighed are in [docs/decisions](../decisions).
