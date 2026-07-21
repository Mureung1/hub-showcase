# 빵지도

대전 지역 베이커리를 여러 곳 선택하면 가장 효율적인 방문 순서(동선)를 자동 계산해주는 웹 서비스.

## 문서

- 기획서: [docs/빵지도_기획서.md](./docs/빵지도_기획서.md)
- 추가 기능 스펙: [docs/빵지도_추가기능_스펙.md](./docs/빵지도_추가기능_스펙.md)
- Task 백로그 (로드맵): [docs/빵지도_Task_백로그.md](./docs/빵지도_Task_백로그.md)
- 디자인 프로토타입: [docs/빵지도_prototype_v2.html](./docs/빵지도_prototype_v2.html)
- 개발 가이드 (구조/컨벤션/기술 결정): [CLAUDE.md](./CLAUDE.md)
- **실제 작업 보드(칸반)**: TODO — GitHub Projects 만든 후 이 줄에 링크 추가

## 기술 스택

- 프론트엔드: React (Vite)
- 백엔드: Express + Supabase(Postgres)
- 지도: 네이버지도 JavaScript SDK (NAVER Cloud Platform Maps API v3)
- 인증: 아이디/비밀번호 + JWT

## 시작하기

```bash
# 프론트엔드
cd client
cp .env.example .env   # VITE_NAVER_MAP_CLIENT_ID 채우기 (NAVER Cloud Platform 콘솔에서 발급)
npm install
npm run dev

# 백엔드 (다른 터미널)
cd server
cp .env.example .env   # JWT_SECRET, DATABASE_URL(Supabase Connection String) 채우기
npm install
npm run db:migrate     # DB 스키마 최초 1회 적용
npm run dev
```

프론트는 `http://localhost:5173`, 백엔드는 `http://localhost:4000`에서 실행되며, `client/vite.config.js`의 프록시 설정으로 `/api` 요청이 자동으로 백엔드로 전달됩니다.
