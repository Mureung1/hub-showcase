# CLAUDE.md — 챌린지로그 개발 규칙

Claude Code(및 협업자)는 세션 시작 시 이 문서를 먼저 읽습니다.
검증 가능한 규칙을 따릅니다.

## 📖 도메인 용어

| 용어 | 정의 |
|---|---|
| 챌린지 (Challenge) | 매일 오전 7시 시스템이 제공하는 랜덤 주제 |
| 기록 (Record) | 하루 1회, 그날의 챌린지에 대해 남기는 사진 + 한 줄 메모 |
| 캘린더 (Calendar) | 기록을 월별로 모아보는 화면, 날짜별 썸네일 표시 |
| 친구 방 (Room) | 3~6명으로 구성된 클로즈드 그룹 |
| 완료 여부 (Completion) | 방 멤버가 오늘 기록을 남겼는지 나타내는 O/X 상태 |
| 방 기록 공유 | 완료(O)한 멤버에 한해 그날의 사진·한 줄 메모를 방 멤버끼리 볼 수 있는 기능. 개수·빈도·순위 집계는 만들지 않습니다 |
| AI 데일리 케어 | 그날 기록의 분위기를 분석해 응원 또는 제안 메시지를 생성하는 기능 |

## ✅ MVP 스코프

- 오늘의 랜덤 챌린지 제공 (매일 07:00)
- 사진 기록 (웹 카메라/파일 업로드 + 한 줄 메모, 1일 1회)
- 캘린더 (날짜별 썸네일, 월별 열람)
- 알림 (매일 07:00 — Web Push 또는 브라우저 알림)
- 소규모 친구 방 (3~6명, 완료 여부만 공유)
- AI 데일리 케어 (응원/제안 메시지)

## ❌ 스코프 밖

- 전체 공개 피드, 탐색(Explore) 기능
- 좋아요·댓글·팔로우 등 SNS형 소셜 기능
- 랭킹·리더보드·스트릭 뱃지 등 비교/게이미피케이션 요소
- 스터디 인증, 집중 시간 측정 등 자기계발 인증 기능
- 방 인원 6명 초과 확장, 대규모 커뮤니티 기능
- 네이티브 모바일 앱 (현재는 웹앱 우선)

애매하면 구현 전에 사용자에게 확인합니다.

## 🛠 개발 환경

| 항목 | 버전/도구 |
|---|---|
| Node.js | 20 LTS 이상 |
| 패키지 매니저 | npm |
| 프론트엔드 | React 19 · Vite 8 · TypeScript · Tailwind CSS v4 |
| 린터 | oxlint |
| 백엔드 (예정) | Java · Spring Boot · PostgreSQL |

## 📂 폴더 구조

```
hub/
├── src/
│   ├── components/     # 재사용 UI 컴포넌트
│   ├── pages/          # 라우트 단위 화면 (추가 예정)
│   ├── hooks/          # 커스텀 훅 (추가 예정)
│   ├── api/            # API 클라이언트 (추가 예정)
│   ├── App.tsx
│   ├── main.tsx
│   ├── vite-env.d.ts
│   └── index.css          # Tailwind 진입점 + @theme 토큰
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── plan.md             # 작업 계획·로드맵
├── checklist.md        # 진행·검증 체크리스트
└── CLAUDE.md
```

새 파일은 위 구조에 맞춰 추가합니다. `server/` 백엔드는 별도 디렉터리로 추가 예정입니다.

## 🚀 빌드·실행 명령어

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 (기본 http://localhost:5173)
npm run build        # tsc + Vite 프로덕션 빌드 → dist/
npm run typecheck    # TypeScript 타입 검사
npm run preview      # 빌드 결과 미리보기
npm run lint         # oxlint 검사
```

코드 변경 후 `npm run typecheck`, `npm run lint`, `npm run build`가 통과해야 합니다.

## 📝 코딩 컨벤션

### React / TypeScript

- 함수형 컴포넌트만 사용합니다. 클래스 컴포넌트는 쓰지 않습니다.
- 컴포넌트 파일명은 PascalCase + `.tsx` (`RecordForm.tsx`).
- 훅·유틸 파일명은 camelCase + `.ts` (`useAuth.ts`, `formatDate.ts`).
- props·API 응답은 `type` 또는 `interface`로 타입을 정의합니다. `any`는 쓰지 않습니다.
- props는 구조 분해로 받고, 이벤트 핸들러는 `handle` 접두사를 씁니다 (`handleSubmit`).
- 상태는 가능하면 가까운 컴포넌트에 두고, 전역 상태 라이브러리는 필요할 때만 도입합니다.

### Tailwind CSS

- 스타일은 Tailwind 유틸리티 클래스로 작성합니다. 별도 `.css` 파일을 만들지 않습니다.
- 브랜드 색·폰트 등 공통 토큰은 `src/index.css`의 `@theme`에 정의합니다.
- 반복되는 클래스 조합은 컴포넌트로 추출합니다. `@apply`는 `@layer base` 등 전역 스타일에만 씁니다.
- 모바일 우선(`sm:`, `md:`) 반응형을 기본으로 합니다.

### API·데이터

- API 호출은 `src/api/`에 모읍니다. 컴포넌트에서 fetch를 직접 쓰지 않습니다.
- 날짜·시간은 KST(Asia/Seoul) 기준으로 처리합니다.
- 하루 1회 기록 제한은 서버에서 검증합니다. 클라이언트 검증만으로는 충분하지 않습니다.

### Git·PR

- 변경 범위는 요청된 작업에 한정합니다. 무관한 리팩터링은 하지 않습니다.
- PR 전 `npm run lint`를 실행합니다.

## 작업 워크플로우

1. `CLAUDE.md` — 절대 원칙·컨벤션 확인
2. `plan.md` — 이번 작업의 Task와 종속성 확인 (`@plan.md`로 지시)
3. 구현 후 `checklist.md` 항목을 갱신·검증

## 재사용 프롬프트 템플릿

**새 기능 추가**
```
[기능명]을 추가해줘.
- 목적:
- 사용자 흐름:
- 백엔드 API 필요 여부:
- 절대 원칙(비교 금지 / 공부 인증류 금지) 위반 여부를 먼저 검토하고 진행해줘.
```

**버그 수정**
```
[화면/기능]에서 [증상]이 발생해.
- 재현 방법:
- 기대 동작:
- 실제 동작:
원인을 파악한 뒤 최소 범위로 수정해줘.
```

**plan 기반 작업**
```
@plan.md 의 Task N을 진행해줘.
완료 후 @checklist.md 해당 항목을 체크하고 검증 방법을 알려줘.
```
