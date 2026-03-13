#1. Stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm --filter "./packages/*" build

RUN pnpm --filter asset build

RUN pnpm --filter asset deploy --prod /prod/asset

#2. Runner
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /prod/asset .

EXPOSE 3003

CMD ["node", "dist/index.js"]
