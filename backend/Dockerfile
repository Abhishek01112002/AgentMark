# syntax=docker/dockerfile:1

# ── Stage 1: Build & Prune Dependencies ───────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*


# Copy dependency definitions and Prisma schema first for optimal caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies needed for build & prisma)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Generate Prisma Client (outputs to node_modules/.prisma/client)
RUN npx prisma generate

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to dist/
RUN npm run build

# Prune devDependencies to keep runtime node_modules lightweight while preserving generated Prisma engine
RUN npm prune --omit=dev

# ── Stage 2: Production Runtime ───────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*


ENV NODE_ENV=production
ENV PORT=5003

# Copy pruned node_modules and built dist from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Use non-root node user for container security
USER node

EXPOSE 5003

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5003/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

CMD ["node", "dist/index.js"]
