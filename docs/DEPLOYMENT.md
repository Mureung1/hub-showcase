# DEPLOYMENT.md

> IRIS MVP 운영 배포 절차와 환경 변수 기준을 정리한 문서입니다.

---

# 1. Deployment Architecture

MVP 배포는 다음 구조를 기준으로 한다.

```text
User
  -> Vercel Frontend
  -> Vercel rewrite /api
  -> EC2 Nginx
  -> EC2 Backend Docker container
  -> EC2 MySQL Docker container
```

Discord Bot과 Scheduler는 Backend container 안에서 같은 Node.js 프로세스로 실행한다.

## Components

- Frontend: Vercel
- Backend: EC2 + Docker
- Database: EC2 Docker MySQL
- CI/CD: GitHub Actions
- API routing: Vercel rewrite
- Reverse proxy: EC2 Nginx

## Branch Policy

브랜치와 PR 작업 기준은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 따른다.

배포는 `deploy` 브랜치 push를 기준으로 GitHub Actions CI/CD를 실행한다.

---

# 2. AWS EC2 Setup

## Security Group

초기 MVP 배포에서는 다음 포트를 사용한다.

| Port | Purpose | Rule |
|---|---|---|
| 22 | SSH | 관리자 IP만 허용 |
| 80 | HTTP | Vercel rewrite 접근용 |

Backend `3000`과 MySQL `3306` 포트는 외부에 열지 않는다.

Nginx가 외부 `80` 요청을 받고, EC2 내부의 `127.0.0.1:3000` Backend로 프록시한다.

향후 도메인과 HTTPS를 붙이면 `443`을 추가로 열고 Nginx 또는 ALB에서 HTTPS를 처리한다.

## Storage

- EBS gp3 20GB 권장
- MySQL 데이터는 Docker volume에 저장한다.
- 운영 환경에서 `docker compose down -v`는 실행하지 않는다.

## Required Runtime

EC2에는 다음 도구가 필요하다.

```bash
docker --version
docker compose version
git --version
nginx -v
```

---

# 3. Production Environment Variables

실제 운영 값은 Git에 커밋하지 않는다.

환경 변수 기준 파일:

```text
.env.production.example
```

GitHub Actions는 GitHub Secrets 값을 사용해 EC2의 프로젝트 루트에 `.env.production`을 생성하거나 갱신한다.

필수 Secrets:

```text
EC2_HOST
EC2_USER
EC2_SSH_KEY

NODE_ENV
PORT
BACKEND_PORT

MYSQL_DATABASE
MYSQL_USER
MYSQL_PASSWORD
MYSQL_ROOT_PASSWORD
DATABASE_URL

DISCORD_BOT_TOKEN
DISCORD_CLIENT_ID
ADMIN_WEB_URL
```

운영 Docker Compose 내부에서 MySQL hostname은 compose service 이름인 `mysql`을 사용한다.

```text
DATABASE_URL=mysql://iris:<password>@mysql:3306/iris
```

`ADMIN_WEB_URL`은 Vercel 배포 후 확정된 Frontend 주소를 사용한다.

```text
ADMIN_WEB_URL=https://your-vercel-app.vercel.app
```

---

# 4. Docker Compose

운영 Compose 파일:

```text
docker-compose.prod.yml
```

서비스 구성:

- `backend`: Express API, Discord Bot, Scheduler 실행
- `mysql`: MySQL 8.4 실행
- `mysql_data`: MySQL 데이터 보존 volume

Backend container는 EC2 localhost에만 포트를 바인딩한다.

```text
127.0.0.1:3000 -> backend container:3000
```

EC2에서 수동으로 확인할 때는 다음 명령을 사용한다.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
docker compose --env-file .env.production -f docker-compose.prod.yml up -d mysql
docker compose --env-file .env.production -f docker-compose.prod.yml build backend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --force-recreate backend
```

배포 workflow는 backend 시작 전에 Prisma migration을 실행한다.
SSH heredoc 환경에서 `docker compose run`이 stdin/attach를 붙잡지 않도록 `-T`, `--no-deps`, `</dev/null`을 사용한다.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run -T --rm --no-deps backend sh -lc 'npm run db:deploy' </dev/null
```

Backend container는 배포마다 새 이미지로 재생성한다. 배포 로그에서는 재생성 전후 container id, image id, `StartedAt`을 출력하며, container id가 바뀌지 않으면 CD를 실패 처리한다.

컨테이너 상태 확인:

```bash
docker compose -f docker-compose.prod.yml ps
docker logs iris-backend --tail 100
docker logs iris-mysql-prod --tail 100
docker inspect iris-backend --format 'id={{.Id}} image={{.Image}} started={{.State.StartedAt}}'
```

---

# 5. EC2 Nginx Setup

Nginx는 EC2의 `80` 포트로 들어온 `/api/` 요청을 Backend container로 전달한다.

설정 파일:

```text
/etc/nginx/sites-available/iris
```

설정 내용:

```nginx
server {
    listen 80 default_server;
    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

활성화:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/iris /etc/nginx/sites-enabled/iris
sudo nginx -t
sudo systemctl reload nginx
```

확인:

```bash
curl http://localhost/api/health
curl http://<EC2_ELASTIC_IP>/api/health
```

---

# 6. Frontend Vercel Setup

Frontend는 Vercel에 배포한다.

Vercel Project 설정:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

운영 환경 변수:

```text
VITE_DISCORD_INVITE_URL=<Discord Bot invite URL>
VITE_SELECTOR_GUIDE_URL=<Selector guide URL>
```

Vercel rewrite는 `/api/:path*` 요청을 EC2 Backend로 전달한다.
Frontend API 기본 경로는 코드에서 `/api`를 사용하므로, rewrite 방식을 사용할 때 `VITE_API_BASE_URL`은 설정하지 않는다.
이미 Vercel에 `VITE_API_BASE_URL`이 등록되어 있다면 삭제하거나 `/api`로 맞춘 뒤 redeploy한다.

```text
/api/:path* -> http://<EC2_ELASTIC_IP>/api/:path*
```

EC2 Elastic IP가 확정된 뒤 `frontend/vercel.json`에 rewrite를 추가한다.

---

# 7. Slash Commands

슬래시 명령어 이름, 설명, 옵션이 바뀌면 운영 등록을 다시 실행한다.

로컬에서 배포 전에 등록할 때는 TypeScript 개발 스크립트를 사용한다.

```bash
cd backend
npm run discord:commands:register:global:dev
```

운영 Backend container에서 등록할 때는 빌드된 `dist` 스크립트를 사용한다.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run discord:commands:register:global
```

전역 명령어는 Discord 반영에 시간이 걸릴 수 있으므로 배포 직전 또는 배포 전에 미리 실행한다.

---

# 8. Automated Health Check

GitHub Actions CD 마지막 단계에서 배포된 Backend가 응답하는지 확인한다.

자동 health check는 운영 DB에 테스트 데이터를 만들지 않는다.

```bash
curl -f http://<EC2_ELASTIC_IP>/api/health
```

Vercel rewrite까지 확인할 때는 다음 요청을 사용할 수 있다.

```bash
curl -f https://<VERCEL_APP_URL>/api/health
```

---

# 9. Post-deploy Manual QA

배포 후 실제 Discord와 관리자 페이지 흐름은 [QA.md](./QA.md)의 Production Smoke Test를 기준으로 확인한다.

---

# 10. Operational Notes

- `docker compose down -v`는 MySQL volume을 삭제하므로 운영에서 사용하지 않는다.
- Backend `3000`과 MySQL `3306`은 Security Group에서 열지 않는다.
- EC2 재부팅 후 컨테이너는 `restart: unless-stopped` 정책으로 자동 재시작된다.
- EC2 Public IP는 바뀔 수 있으므로 Elastic IP를 사용한다.
- 도메인과 Backend HTTPS를 붙이지 않는 MVP 배포에서는 Vercel rewrite로 브라우저의 Mixed Content 문제를 줄인다.
- 향후 운영 안정화 단계에서는 도메인, Nginx 또는 ALB, HTTPS, RDS MySQL 분리를 검토한다.
