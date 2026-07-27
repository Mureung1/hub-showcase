# Build context MUST be the repo root (see docs/deployment.md):
#   docker build -f backend/Dockerfile .

FROM node:24-slim AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends curl python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*
COPY data/scripts/requirements.txt /data/scripts/requirements.txt
RUN pip install --no-cache-dir --break-system-packages -r /data/scripts/requirements.txt
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY data/master/ /data/master/
COPY data/scripts/ /data/scripts/

EXPOSE 5000
CMD ["node", "dist/server.js"]
