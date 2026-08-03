FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/protocol ./packages/protocol
COPY apps/relay ./apps/relay

# Install workspace deps for relay + protocol (lockfile optional on first render)
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --filter @goprivate/relay... --frozen-lockfile; \
    else \
      pnpm install --filter @goprivate/relay...; \
    fi

RUN pnpm --filter @goprivate/protocol build \
 && pnpm --filter @goprivate/relay build

# Portable production bundle (includes workspace deps like @goprivate/protocol)
RUN pnpm --filter @goprivate/relay deploy --prod --legacy /app/deploy

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

COPY --from=build /app/deploy ./

EXPOSE 3001
CMD ["node", "dist/index.js"]
