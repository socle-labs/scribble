FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile

# Build all packages
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Migration runner
FROM base AS migrate
COPY --from=deps /app/node_modules ./node_modules
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
WORKDIR /app/packages/db
CMD ["bunx", "drizzle-kit", "migrate"]

# API server
FROM base AS api
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages ./packages
EXPOSE 3000
CMD ["bun", "apps/api/dist/index.js"]

# Web server
FROM base AS web
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["bun", "next", "start"]

# Worker
FROM base AS worker
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages ./packages
CMD ["bun", "apps/worker/dist/index.js"]
