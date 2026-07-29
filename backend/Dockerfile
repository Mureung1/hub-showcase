FROM node:24-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm install

COPY backend/ .

CMD ["npm", "start"]
