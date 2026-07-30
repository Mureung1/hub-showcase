# 라우트 구조 및 랜딩 페이지 (11 일차)

## 라우트 구조

```
/                → Landing (공개)
/login           → Login (공개)
/register        → Register (공개)
/privacy         → Privacy (공개)
/terms           → Terms (공개)
/app/            → redirect to /app/dashboard
/app/dashboard   → Dashboard (보호됨)
/app/customers   → Customers (보호됨)
/app/customers/new → NewCustomer (보호됨)
/app/customers/:id → CustomerDetail (보호됨)
/app/reservations → Reservations (보호됨)
/app/reservations/new → NewReservation (보호됨)
/500             → ServerError
*                → NotFound
```

## 라우트 마이그레이션 방법

기존에 `/` 아래에 있던 보호된 라우트를 `/app/*` 으로 이동할 때:

1. App.tsx 에서 `<Route path="/app" ...>` 로 변경
2. AppLayout 네비게이션 경로에 `/app` 접두사 추가
3. `grep -rn` 으로 모든 내부 링크 찾기:
   ```bash
   grep -rn 'to="/dashboard\|to="/customers\|to="/reservations\|navigate.*dashboard\|navigate.*customers\|navigate.*reservations' src/pages/ --include='*.tsx'
   ```
4. `sed` 로 일괄 수정:
   ```bash
   sed -i '' "s|to=\"/dashboard|to=\"/app/dashboard|g; s|to=\"/customers|to=\"/app/customers|g; s|to=\"/reservations|to=\"/app/reservations|g" src/pages/*.tsx
   sed -i '' "s|navigate('/dashboard'|navigate('/app/dashboard'|g; s|navigate('/customers'|navigate('/app/customers'|g; s|navigate('/reservations'|navigate('/app/reservations'|g" src/pages/*.tsx
   ```

## 랜딩 페이지 구성

- Hero: 서비스 한 줄 소개 + CTA (가입/로그인)
- Features: 4 개 기능 카드 (SVG line icons, 이모지 금지)
  - 고객 검색 (돋보기 아이콘)
  - 위험도 경고 (삼각형 아이콘)
  - 예약 관리 (클립보드 아이콘)
  - 개인정보 보호 (사람 아이콘)
- CTA: "지금 시작하세요" + 무료 가입 버튼
- Footer: 개인정보처리방침 / 이용약관 링크 + 참고용 지표 안내문