#1. Builder
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml ./

COPY apps/upload/package.json           ./apps/upload/
COPY packages/auth/package.json         ./packages/auth/
COPY packages/config/package.json       ./packages/config/
COPY packages/database/package.json     ./packages/database/
COPY packages/logger/package.json       ./packages/logger/
COPY packages/rabbitmq/package.json     ./packages/rabbitmq/
COPY packages/rate-limit/package.json   ./packages/rate-limit/

RUN pnpm install --filter upload --filter "@repo/*" --frozen-lockfile

COPY packages/ ./packages/
COPY apps/upload ./apps/upload

RUN pnpm --filter upload run build

RUN pnpm --filter upload deploy --legacy --prod /prod/upload

#2. Runner
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/upload/dist ./dist
COPY --from=builder /prod/upload/ ./

EXPOSE 3002

CMD ["node", "dist/index.js"]
