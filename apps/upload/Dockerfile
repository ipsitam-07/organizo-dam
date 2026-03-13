#1. Builder
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm --filter "./packages/*" build

RUN pnpm --filter upload build

RUN pnpm --filter upload deploy --prod /prod/upload

#2. Runner
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /prod/upload .

EXPOSE 3002

CMD ["node", "dist/index.js"]
