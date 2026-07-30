FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN VITE_ICU_API_MODE=server VITE_CURRICULUM_RECOMMENDATION_MODE=server npm run build
RUN npm prune --omit=dev

FROM node:22-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend ./backend
COPY --from=build /app/shared ./shared
COPY --from=build /app/data ./data
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-preview ./dist-preview

CMD ["npm", "start"]