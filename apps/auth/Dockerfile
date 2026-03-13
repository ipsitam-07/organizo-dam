#1. Builder
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml ./

COPY apps/auth/package.json             ./apps/auth/
COPY packages/auth/package.json         ./packages/auth/
COPY packages/config/package.json       ./packages/config/
COPY packages/database/package.json     ./packages/database/
COPY packages/logger/package.json       ./packages/logger/
COPY packages/rate-limit/package.json   ./packages/rate-limit/

RUN pnpm install --filter auth --filter "@repo/*" --frozen-lockfile

COPY packages/ ./packages/
COPY apps/auth ./apps/auth

RUN pnpm --filter "@repo/*" run build 
RUN pnpm --filter auth run build

RUN pnpm --filter auth deploy --legacy --prod /prod/auth

#2. Runner
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/auth/dist ./dist
COPY --from=builder /prod/auth ./

EXPOSE 3001

CMD ["node", "dist/index.js"]
