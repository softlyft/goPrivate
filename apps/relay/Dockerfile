FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/protocol/package.json ./packages/protocol/
COPY apps/relay/package.json ./apps/relay/
RUN pnpm install --filter @goprivate/relay... --frozen-lockfile || pnpm install --filter @goprivate/relay...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/protocol/node_modules ./packages/protocol/node_modules
COPY --from=deps /app/apps/relay/node_modules ./apps/relay/node_modules
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/protocol ./packages/protocol
COPY apps/relay ./apps/relay
RUN pnpm --filter @goprivate/protocol build && pnpm --filter @goprivate/relay build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
COPY --from=build /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=build /app/packages/protocol/package.json ./packages/protocol/
COPY --from=build /app/apps/relay/dist ./apps/relay/dist
COPY --from=build /app/apps/relay/package.json ./apps/relay/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/relay/node_modules ./apps/relay/node_modules
COPY --from=build /app/package.json ./
EXPOSE 3001
CMD ["node", "apps/relay/dist/index.js"]
