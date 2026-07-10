# 셰르파 · Sherpa — 워크스페이스

소형 마트용 재고·유통기한 관리 웹앱. 철학은 **급진적 단순함**. 결제/판매 기능은 범위 밖.

## 구조 (pnpm 워크스페이스)

```
sherpa-app/
  apps/
    web/        # 실제 앱 (React + TS + Vite + Dexie) — 현재 Slice 0
    landing/    # 아이디어 소개 랜딩 페이지 (React + JS)
  packages/
    core/       # 도메인 타입(Product/Lot) + 공유 유틸 — web/mobile 공유
  docs/         # 설계 결정 기록
```

## 실행

```bash
pnpm install
pnpm dev            # apps/web 개발 서버 (http://localhost:5173)
pnpm build          # apps/web 타입체크 + 빌드
pnpm dev:landing    # 랜딩 페이지 개발 서버
```

## 현재 단계

**Slice 0** — 바코드 스캔 → Dexie 조회 → 등록됨/미등록 분기.
설계 결정·도메인 용어집은 [`docs/slice-0-decisions.md`](docs/slice-0-decisions.md).
