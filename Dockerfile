# Multi-stage build for Node.js deployment

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9.15.0

# Copy package files and .npmrc config
COPY package.json pnpm-lock.yaml .npmrc ./

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source files and config
COPY tsconfig.json vite.config.ts ./
COPY src ./src

# Build the application
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9.15.0

# Copy package files and .npmrc config
COPY package.json pnpm-lock.yaml .npmrc ./

# Install only production dependencies
# .npmrc contains shamefully-hoist=true for compatibility
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application using node directly
CMD ["node", "dist/entry/node-http.js"]
