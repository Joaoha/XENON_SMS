# XENON Stock Management System — Dockerfile
# Multi-stage build producing a minimal production image.
# Requires next.config.ts to have output: "standalone"

# ---------- Stage 1: deps ----------
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

# ---------- Stage 2: builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- Stage 3: runner ----------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone server bundle
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static    ./.next/static
COPY --from=builder /app/public          ./public

# Prisma: schema, migrations, config, CLI, and generated client
COPY --from=builder /app/prisma            ./prisma
COPY --from=builder /app/prisma.config.ts  ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma   ./node_modules/prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run database migrations then start the server
CMD npx prisma migrate deploy && node server.js
