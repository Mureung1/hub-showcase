# 커리큘럼 보관함과 이어서 학습

## 목적

사용자가 생성한 커리큘럼 snapshot을 보관하고, 원하는 계획을 다시 활성화해 Today Hub와 Workspace에서 이어서 학습할 수 있게 합니다.

- Route: `/curriculum/history`
- 화면: `src/features/curriculum/CurriculumHistoryPage.tsx`
- 상세 모달: `src/features/curriculum/components/CurriculumDetailModal.tsx`

## 현재 구현

1. **최신순 카드 목록**
   - 생성 시각, 학습 목표, 제목, 단계 수, 오늘 미션 표시
   - 각 카드가 생성 날짜를 표시하지만 날짜별 section grouping은 하지 않음

2. **검색**
   - 목표와 제목을 기준으로 저장된 snapshot 검색

3. **이어서 학습하기**
   - 선택한 snapshot을 활성 커리큘럼으로 변경
   - 해당 generated mission의 Workspace로 이동
   - 이미 활성화된 snapshot도 저장된 단계부터 다시 진입

4. **상세 보기**
   - 전체 단계, 예상 기간, 집중 역할, 추천 출처 확인

5. **삭제와 중복 정리**
   - 개별 snapshot 삭제
   - 동일 목표의 중복 snapshot 일괄 정리

현재 버전 번호, 최신 버전 태그, 재생성 횟수 태그는 제공하지 않습니다.

## 사용자 흐름

```text
/today 또는 AppShell
  → /curriculum/history
  → 검색 또는 카드 선택
  ├─ 상세 보기
  ├─ 이어서 학습하기 → /workspace?mission=<generated-mission-id>
  ├─ 개별 삭제
  └─ 중복 항목 정리
```

## API

```text
GET    /api/curriculum/history
GET    /api/curriculum/generated
POST   /api/curriculum/generated
DELETE /api/curriculum/generated/:id
DELETE /api/curriculum/generated
```

## Repository

- `inMemoryGeneratedCurriculumRepository.mjs`
- `sqliteGeneratedCurriculumRepository.mjs`
- `supabaseGeneratedCurriculumRepository.mjs`

Repository mode별 저장은 서로 독립적입니다. SQLite와 localStorage를 자동 동기화하지 않습니다. 기본 server mode에서는 API 응답으로 store를 hydrate하고, mock mode에서만 localStorage fallback을 사용합니다.

## 후속 요청 생성과의 관계

`/today/goal`의 후속 요청은 `previousPlan`과 `followUpInstruction`을 전달해 새 snapshot을 생성합니다. 보관함은 이 결과를 조회·활성화·삭제하며 생성 자체는 담당하지 않습니다.

## 검증

- 최신순 목록과 검색
- 상세 모달 열기·닫기
- 활성화 후 Today Hub와 Workspace의 plan 일치
- 개별 삭제와 동일 목표 중복 정리
- in-memory, SQLite, Supabase mode API contract 일치
