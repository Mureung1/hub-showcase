# Career Mission AI Backend

Express backend server for Career Mission AI.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment

Real API keys belong in `backend/.env`, not in frontend code.

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/career_mission_ai
CAREER_NET_API_KEY=your_career_net_api_key
PUBLIC_DATA_API_KEY=your_public_data_api_key
```

## PostgreSQL

This backend uses Prisma with PostgreSQL.

1. Start a PostgreSQL server.
2. Create a database named `career_mission_ai`.
3. Set `DATABASE_URL` in `backend/.env`.
4. Run the migration.

```bash
npm --prefix backend run db:migrate -- --name init
```

Useful DB commands:

```bash
npm --prefix backend run db:generate
npm --prefix backend run db:studio
```

## Health Check

```txt
GET http://localhost:4000/api/health
```

## Career APIs

Frontend requests these backend endpoints. External API keys stay in `backend/.env`.

```txt
GET http://localhost:4000/api/jobs?keyword=백엔드
GET http://localhost:4000/api/qualifications?keyword=SQL
```

## Email Verification

Verification emails are sent through SMTP.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Career Mission AI <your_email@gmail.com>"
```

For Gmail, use an app password instead of the normal account password.
