# SCS pilot API image — used by the api and migrate services.
#
# Build context: scs-pilot/packages (the image needs api/ and db/migrations/):
#   docker build -f api/Dockerfile -t scs-pilot-api:local packages
#
# Everything the container runs is fixed at build time: dependencies are
# installed from package-lock.json (npm ci) during the build, the TypeScript is
# compiled here, and the container installs nothing and fetches nothing when it
# starts. It needs no network access except to the services it is configured
# for (PostgreSQL and the object store).
#
# Nothing secret is built in: the static actors file (token digests), database
# passwords and object store credentials are supplied at run time (a read-only
# mount and environment variables). .dockerignore keeps them out of the build
# context.
#
# The base image is pinned to the exact version and digest that produced the
# verified AAB-PLATFORM-02 rendition (commit 9a2238c).

ARG NODE_IMAGE=node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

# ── Build: all dependencies, compile ────────────────────────────────────────
FROM ${NODE_IMAGE} AS build
WORKDIR /build/api
COPY api/package.json api/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY api/tsconfig.json api/tsconfig.build.json ./
COPY api/src ./src
RUN npm run build

# ── Runtime: production dependencies and the compiled output only ───────────
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /build/api/dist ./dist
# the fonts recorded in AAB-PLATFORM-02, checked against their SHA-256 at use
COPY api/assets ./assets
# the migrations the migrate service applies (runner default: /db/migrations)
COPY db/migrations /db/migrations
# files stay owned by root: the service can read its code, never change it
USER node
EXPOSE 3000
# the image reports its own health, on any platform that runs it: GET /health
# on the API's port (API_PORT, default 3000). The migrate service runs the
# same image as a one-off command and switches this off (docker-compose.yml).
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://127.0.0.1:' + (process.env.API_PORT || 3000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]
CMD ["node", "dist/index.js"]
