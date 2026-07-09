# 한끼바꿈 🤝

지역거점국립대 학생의 디지털 재능과 대학가 사장님의 식사권을 물물교환하는 로컬 상생 플랫폼.

## 실행 방법

```bash
# 1) 프론트엔드
cd client
cp .env.example .env    # 값 채우기
npm install
npm run dev             # http://localhost:5173

# 2) 백엔드 (새 터미널)
cd server
cp .env.example .env    # 값 채우기
npm install
npm run dev             # http://localhost:3000
```

## 구조
- `client/` React + Vite
- `server/` Express — AI 문구 생성 프록시 + 핵심 규칙 검증 담당
- `docs/` 기획서(plan.md) · 프로토타입(prototype.html) · 디자인 기준 화면(wallet-warm.html)
- `.claude/skills/hankki-design/` 디자인 시스템 스킬
- 규칙·컨벤션은 `CLAUDE.md` 참고
