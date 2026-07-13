# 식비구조대

자취생·1인 가구가 재료 최저가를 찾느라 시간을 쓰지 않도록, 카테고리별로 가성비 좋은 요리를 추천하고 재료별 네이버/쿠팡 구매 링크를 바로 보여주는 서비스입니다.

홈 화면에서 카테고리(볶음밥, 파스타, 찌개 등)를 고르면 그 안에서 가장 저렴한 요리부터 확인할 수 있고, 요리를 클릭하면 재료 목록과 함께 재료별 구매 링크를 볼 수 있습니다.

## 기술 스택

- 프론트엔드: React + Vite + Tailwind CSS + React Router
- 백엔드(예정): Vercel Serverless Functions
- 시세 데이터(예정): 공공데이터포털 KAMIS 오픈API — 현재는 개발 중이라 목업 데이터로 동작합니다.

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # oxlint로 코드 검사
```

## 더 알아보기

- [plan.md](./plan.md) — 문제 정의, 기존 서비스 분석, 화면 흐름 등 기획 문서
- [task.md](./task.md) — 주차별 로드맵과 우선순위 백로그 (언제·뭐부터 할지)
- [checklist.md](./checklist.md) — 영역별 작업 목록과 진행 상황 (무엇을·얼마나 됐는지)
- [CLAUDE.md](./CLAUDE.md) — 서비스 목적, 커밋 규칙, 개발 원칙
- [2주차 개발 대시보드](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/690) — 이번 주 작업을 우선순위·요일 순으로 정리한 이슈
