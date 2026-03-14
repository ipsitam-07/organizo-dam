#1. Builder
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm --filter "./packages/*" build

RUN pnpm --filter workers build

RUN pnpm --filter workers deploy --prod /prod/workers

#2. Runner 
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache ffmpeg poppler-utils

COPY --from=builder /prod/workers .

EXPOSE 9090

CMD ["node", "dist/index.js"]
