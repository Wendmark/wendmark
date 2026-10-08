# The portal, as an image you can run.
#
# Build from the repository root, because the portal is part of a workspace
# and its build needs the snippet, which is produced by another package:
#
#   docker build -t wendmark/portal .
#
# The image does not carry the Prisma CLI, so it cannot migrate its own
# database. docker-compose.prod.yml runs migrations as a separate one-shot
# service built from the `build` stage; docs/deploying.md says what to do on
# a platform that does not use compose.

# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- build -----------------------------------------------------------------
# Everything in one stage. pnpm's node_modules are a tree of symlinks into a
# content-addressed store, and copying that between stages is a reliable way
# to produce an image that works until it does not.
FROM base AS build

COPY . .

# --frozen-lockfile: a deploy build must fail rather than quietly resolve
# different versions than the ones that were tested.
RUN pnpm install --frozen-lockfile

# Builds the snippet first and then the portal — turbo.json has that order,
# because the portal serves snippet.js as a static file.
RUN pnpm build

# ---- runner ----------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
# Next's standalone server listens on localhost unless told otherwise, which
# in a container means nothing outside it can connect.
ENV HOSTNAME=0.0.0.0
ENV PORT=3100

# Nothing here needs to be root.
RUN addgroup -g 1001 wendmark && adduser -u 1001 -G wendmark -s /bin/sh -D wendmark

# The standalone output already contains the server and the node_modules it
# traced. Static assets and public files are not part of it.
COPY --from=build --chown=wendmark:wendmark /app/apps/portal/.next/standalone ./
COPY --from=build --chown=wendmark:wendmark /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=build --chown=wendmark:wendmark /app/apps/portal/public ./apps/portal/public

USER wendmark
EXPOSE 3100

# A plain request to the portal: it redirects to /sign-in, which is enough to
# know the server is answering.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/portal/server.js"]
