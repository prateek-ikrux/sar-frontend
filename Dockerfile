# =========================================
# Stage 1: Build the React (Vite) Application
# =========================================

ARG NODE_VERSION=24.14.0-alpine
# Use a lightweight Node.js image for building (customizable via ARG)
FROM node:${NODE_VERSION} AS builder


# Set the working directory inside the container
WORKDIR /app


# Copy package-related files first to leverage Docker's caching mechanism
COPY package.json package-lock.json ./


# Install project dependencies using npm ci (ensures a clean, reproducible install)
RUN --mount=type=cache,target=/root/.npm npm ci


# Copy the rest of the application source code into the container
COPY . .

# Vite inlines VITE_* variables at build time, so the API URL must be
# supplied here (.env is excluded from the build context)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build the React.js application (outputs to /app/dist)
RUN npm run build


# =========================================
# Stage 2: Serve static files with Node.js + `serve`
# =========================================
FROM node:${NODE_VERSION} AS runner


# Set the working directory inside the container
WORKDIR /app


# Install only the `serve` package (pinned version)
RUN --mount=type=cache,target=/root/.npm npm install serve@14.2.6


# Copy only the production build output from the builder stage
COPY --link --from=builder /app/dist ./dist


# Run the container as a non-root user for security best practices
USER node


# Expose port 3000 (the same port configured in "serve -l 3000")
EXPOSE 3000


# Liveness probe: serve answers / with index.html once it is listening
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null "http://127.0.0.1:3000/" || exit 1


# Run `serve` directly to serve the built app (-s: fall back to index.html for client-side routes)
CMD ["./node_modules/.bin/serve", "-s", "dist", "-l", "3000"]
