# CodeMail SMTP Ingress Server
# Multi-stage build for minimal production image

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 codemail && \
    adduser -u 1001 -G codemail -s /bin/sh -D codemail

# Copy only production dependencies
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R codemail:codemail /app

# Switch to non-root user
USER codemail

# Expose SMTP port (using 2525 internally to avoid needing root)
# Fly.io routes external 25/587 to internal 2525
EXPOSE 2525

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD nc -z localhost ${SMTP_PORT:-2525} || exit 1

# Environment variables (override in deployment)
ENV NODE_ENV=production \
    SMTP_PORT=2525 \
    SMTP_HOST=0.0.0.0 \
    LOG_LEVEL=info

# Start the server
CMD ["node", "dist/index.js"]
