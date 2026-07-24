# Dockerfile.frontend — React(Vite) 빌드 후 Nginx로 서빙
# 위치: 프론트엔드 폴더(package.json이 있는 곳)에 이 파일과 nginx.conf를 두세요

# 1단계: 빌드
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2단계: 서빙
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
