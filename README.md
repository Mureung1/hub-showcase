# Hub

AI Agent Challenge 4주 동안의 활동을 진행할 메인 작업 저장소입니다.

아직 만들 프로젝트의 아이템은 확정하지 않았고, 현재는 Express와 React를 함께 쓰는 웹앱이라는 방향만 잡아 둔 상태입니다. 그래서 구조도 서버와 클라이언트가 연결되는지 확인할 수 있는 최소 수준으로 유지합니다.

## Current Stack

- `server/`: Express API 서버
- `client/`: Vite React 클라이언트
- `/api/health`: 서버와 클라이언트 연결 확인용 엔드포인트

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

아이템이 정해지기 전까지는 라우터, DB, 인증, 상태관리 같은 선택지를 미리 고정하지 않습니다.
