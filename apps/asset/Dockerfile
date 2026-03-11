#1. Stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml ./

COPY apps/asset/package.json            ./apps/asset/
COPY packages/auth/package.json         ./packages/auth/
COPY packages/config/package.json       ./packages/config/
COPY packages/database/package.json     ./packages/database/
COPY packages/logger/package.json       ./packages/logger/
COPY packages/rabbitmq/package.json     ./packages/rabbitmq/
COPY packages/rate-limit/package.json   ./packages/rate-limit/

RUN pnpm install --filter asset --filter "@repo/*" --frozen-lockfile

COPY packages/ ./packages/
COPY apps/asset ./apps/asset

RUN pnpm --filter asset run build

RUN pnpm --filter asset deploy --legacy --prod /prod/asset

#2. Runner
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/asset/dist ./dist
COPY --from=builder /prod/asset ./

EXPOSE 3003

CMD ["node", "dist/index.js"]
