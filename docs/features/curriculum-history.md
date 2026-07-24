# 생성 커리큘럼 날짜별 관리 및 이어서 학습 (Curriculum History & Resume)

## Overview

사용자가 그동안 AI로 생성했던 커리큘럼 플랜들을 날짜별로 보관하고, 필요할 때 언제든 원하는 커리큘럼을 활성화하여 학습을 이어서 진행할 수 있는 **커리큘럼 보관함(Curriculum History)** 기능 명세입니다.

---

## Key Features

1. **날짜별 생성 이력 리스트 (Date-grouped History List)**
   - 생성 시각(`generatedAt`), 학습 목표(`goal`), 커리큘럼 타이틀, 전체 단계 수 및 오늘 추천 미션 미리보기 카드 제공
   - 생성 일자 기준 내림차순(최신순) 그룹화 및 정렬

2. **이어서 학습하기 (Activate & Resume Learning)**
   - 보관함의 특정 커리큘럼 카드에서 `이어서 학습하기` 클릭 시 해당 플랜이 메인 활성 커리큘럼(`generatedCurriculum`)으로 즉시 복원됨
   - Today Hub 및 Learning Workspace로 즉시 연결되어 기존 실습을 계속 이어감

3. **상세 보기 모달 (Curriculum Detail Modal)**
   - 선택한 과거 커리큘럼의 전체 세부 단계(Step 1, 2, ...), 예상 기간, 집중 역할, 추천 공식 문서 출처를 한눈에 확인

4. **중복 커리큘럼 관리 및 정리 (Duplicate Curriculum Management)**
   - 동일한 학습 목표(`goal`)로 커리큘럼을 재생성할 경우, 보관함 목록에 무분별한 중복 카드가 무한 생성되지 않도록 동일 목표 기반 갱신 및 버전 관리(`버전 1`, `버전 2 (최신)`) 지원
   - 동일 목표 카드에 `재생성 횟수` 태그 표시 및 보관함 내 `중복 항목 일괄 정리` 기능 제공

5. **대화형 후속 질문 기반 생성 (Multi-turn Follow-up Generation)**
   - 이전 커리큘럼 스냅샷(`previousPlan`)과 후속 지시어(`followUpInstruction`, 예: "3주 커리큘럼 짜줘", "어제 거에 이어서 짜줘")를 전달받아 Gemini AI가 문맥에 맞게 기간 조정 및 연속 단계 커리큘럼 재생성
   - Quick Chips (예: ⚡ 3주 코스로 변경, ⚡ 어제 내용 이어서) 및 후속 질문 필드 제공

6. **개별 삭제 및 정리 (Delete & Maintenance)**
   - 더 이상 필요 없는 과거 생성 커리큘럼 항목 개별 삭제
   - 백엔드 SQLite DB (`generated_curriculums`) 및 로컬 스토리지 자동 동기화

---

## User Flow

```txt
[Today Hub / GNB 메뉴]
    └── "커리큘럼 보관함" 클릭 (/curriculum/history)
            │
            ├── 날짜별 생성 카드 목록 확인
            ├── "이어서 학습하기" 버튼 클릭 ──> 메인 커리큘럼으로 활성화 ──> /today 또는 /workspace로 이동
            ├── "상세 보기" 버튼 클릭 ──> 세부 단계 및 출처 모달 확인
            └── "삭제" 버튼 클릭 ──> 백엔드 DB & 로컬 스토리지 삭제
```

---

## Technical Architecture

### 1. Backend Layer (`backend/`)
- **Repository**:
  - `backend/modules/curriculum/adapters/inMemoryGeneratedCurriculumRepository.mjs`
  - `backend/modules/curriculum/adapters/sqliteGeneratedCurriculumRepository.mjs`
  - 추가 메서드: `list()`, `getById(id)`, `delete(id)`
- **HTTP Routes**:
  - `GET /api/curriculum/history`: 저장된 전체 생성 커리큘럼 목록 반환
  - `DELETE /api/curriculum/generated/:id`: 특정 생성 커리큘럼 삭제

### 2. Frontend Store & API Client (`src/features/curriculum/`)
- **API Client (`curriculumClient.ts`)**:
  - `getCurriculumHistory()`
  - `deleteCurriculumHistoryItem(id)`
- **Zustand Store (`useGeneratedCurriculumStore.ts`)**:
  - `history: GeneratedCurriculumSnapshot[]`
  - `activateCurriculumSnapshot(id)`
  - `deleteCurriculumSnapshot(id)`
  - `hydrateHistory(snapshots)`

### 3. UI Components (`src/features/curriculum/`)
- `src/features/curriculum/CurriculumHistoryPage.tsx` & `.module.css` (메인 보관함 화면)
- `src/features/curriculum/components/CurriculumDetailModal.tsx` & `.module.css` (상세 모달)
- `src/app/router.tsx`: `/curriculum/history` 라우트 등록
- `src/app/AppShell.tsx`: 사이드바 `커리큘럼 보관함` 메뉴 추가

---

## Verification & QA Criteria

1. `npm test`: backend 레포지토리/라우트 및 frontend store/client unit test 통과
2. `npx tsc --noEmit`: 타입 오류 0건
3. `npm run build`: 프론트엔드 및 미리보기 빌드 검증 성공
4. **UX 검증**: 보관함에서 `이어서 학습하기` 클릭 시 Today Hub의 '최근 생성한 커리큘럼'이 해당 플랜으로 갱신되고 Workspace 진입 시 해당 플랜의 미션이 노출되는지 확인
