# Build stage for client
FROM node:20-slim AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install

COPY client/ .
RUN npm run build

# Build stage for server
FROM node:20-slim AS server-builder

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install

COPY server/ .

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Copy built client files
COPY --from=client-builder /app/client/dist ./client/dist

# Copy server files and dependencies
COPY --from=server-builder /app/server ./server
COPY --from=server-builder /app/server/node_modules ./server/node_modules

# Copy root package.json
COPY package*.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start command
CMD ["node", "server/index.js"] 