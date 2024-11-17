# Build stage for client

FROM node:20-slim AS client-builder



WORKDIR /app/client

COPY client/package*.json ./

RUN npm install --legacy-peer-deps



COPY client/ .

RUN npm run build



# Build stage for server

FROM node:20-slim AS server-builder



WORKDIR /app/server

COPY server/package*.json ./

RUN npm install



COPY server/ .

COPY server/tsconfig.json ./



# Install TypeScript and build

RUN npm install -g typescript

RUN npx tsc



# Production stage

FROM node:20-slim AS runner



WORKDIR /app



# Copy built client files

COPY --from=client-builder /app/client/dist ./client/dist



# Copy server files and dependencies

COPY --from=server-builder /app/server/dist ./server

COPY --from=server-builder /app/server/node_modules ./server/node_modules

COPY --from=server-builder /app/server/package.json ./server/



# Set environment variables

ENV NODE_ENV=production

ENV PORT=5000



# Expose port

EXPOSE 5000



# Start command

CMD ["node", "server/index.js"] 






