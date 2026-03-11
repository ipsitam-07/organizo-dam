#1. Builder
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ ffmpeg poppler-utils

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml ./

COPY apps/workers/package.json          ./apps/workers/
COPY packages/config/package.json       ./packages/config/
COPY packages/database/package.json     ./packages/database/
COPY packages/logger/package.json       ./packages/logger/
COPY packages/rabbitmq/package.json     ./packages/rabbitmq/

RUN pnpm install --filter workers --filter "@repo/*" --frozen-lockfile

COPY packages/ ./packages/
COPY apps/workers ./apps/workers

RUN pnpm --filter workers run build

RUN pnpm --filter workers deploy --legacy --prod /prod/workers

#2. Runner 
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache ffmpeg poppler-utils

COPY --from=builder /app/apps/workers/dist ./dist
COPY --from=builder /prod/workers ./

EXPOSE 9090

CMD ["node", "dist/index.js"]
