FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter "./packages/*" build

RUN pnpm --filter auth build

RUN pnpm --filter auth deploy --prod /prod/auth

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /prod/auth .

EXPOSE 3001

CMD ["node", "dist/index.js"]
