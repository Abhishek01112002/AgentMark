# syntax=docker/dockerfile:1

# ── Stage 1: Build Frontend Assets ────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (development dependencies are required for building React/Vite)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source files
COPY . .

# Build static assets to dist/ directory
RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:alpine-slim

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration which handles /api proxies and SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
