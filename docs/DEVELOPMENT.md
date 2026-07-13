# Development

## 설치 방법

```bash
npm install
```

CI나 깨끗한 설치가 필요할 때는 lockfile을 기준으로 설치합니다.

```bash
npm ci
```

## 개발 서버 실행 방법

```bash
npm run dev
```

Windows PowerShell에서 `npm.ps1` 실행 정책 오류가 나면 다음처럼 실행합니다.

```powershell
cmd /c npm run dev
```

## 기본 명령

```bash
npm run lint
npm run build
npm run verify
```

현재 테스트 스크립트는 없습니다. `npm run verify`는 지금 실제로 지원되는 `lint`와 `build`만 실행합니다.

## 브랜치 생성 방법

브랜치는 한 가지 주요 목적만 담습니다.

```bash
git switch -c codex/작업-이름
```

이미 브랜치가 있다면 현재 브랜치와 작업 트리를 먼저 확인합니다.

```bash
git status --short --branch
```

## 작업 후 검증 방법

구현 또는 문서 하네스 변경 후 다음 명령을 실행합니다.

```bash
npm run verify
```

PowerShell에서 막히면 다음 명령을 사용합니다.

```powershell
cmd /c npm run verify
```

개발 서버 시작 가능 여부는 다음 명령으로 확인합니다.

```powershell
cmd /c npm run dev
```

서버가 정상적으로 시작되면 종료해도 됩니다.

## Pull Request 전 확인 사항

- 브랜치 목적이 하나인지 확인합니다.
- 제품 기능, 문서, 도구 설정이 불필요하게 섞이지 않았는지 확인합니다.
- `npm run verify`가 통과했는지 확인합니다.
- 새 의존성을 추가했다면 이유와 영향을 설명합니다.
- 사용자가 요청하지 않았다면 commit, push, Pull Request 생성, merge를 하지 않습니다.

## Windows PowerShell에서 사용하는 명령

PowerShell 실행 정책 때문에 `npm` 대신 `cmd /c npm ...`가 필요할 수 있습니다.

```powershell
cmd /c npm install
cmd /c npm run dev
cmd /c npm run lint
cmd /c npm run build
cmd /c npm run verify
```

## 새 컴퓨터에서 이어서 작업하기

USB나 GitHub에서 프로젝트를 가져온 뒤 먼저 의존성을 설치하고 현재 브랜치와 검증 상태를 확인합니다.

```powershell
cd D:\cafe_stamp
cmd /c npm install
git status --short --branch
cmd /c npm run verify
```

`.env` 파일은 Git에 올리지 않습니다. Supabase 연결값이 필요하면 `.env.example`을 참고해서 새 컴퓨터에서 직접 `.env`를 만듭니다.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

프런트엔드에는 Supabase `service_role` 키를 넣지 않습니다.

## Supabase CLI로 DB 스키마 적용하기

Supabase 프로젝트를 만든 뒤, CLI가 준비된 컴퓨터에서 마이그레이션을 적용합니다. 이 작업은 컴퓨터 환경과 Supabase 계정 로그인이 필요하므로, 노트북을 바꿀 예정이면 새 컴퓨터에서 진행합니다.

```powershell
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

`project-ref`는 Supabase 프로젝트 URL의 `https://<project-ref>.supabase.co`에서 확인할 수 있습니다. 현재 저장소의 DB 스키마 파일은 `supabase/migrations/` 아래에 둡니다.

## 파일럿 데이터 준비

이번 MVP는 일반 공개 서비스가 아니라 카페 1곳, 사장님 1명, 손님 1~2명이 실제로 며칠 써보는 파일럿을 기준으로 합니다. 개발과 배포 검증 시 다음 데이터가 반복해서 준비되어야 합니다.

- 파일럿 사장님 Auth 계정 1개
- 파일럿 손님 Auth 계정 1~2개
- 파일럿 카페 1개
- 필요하면 화면 확인용 추가 카페 1~2개
- 손님별 고정 `member_number`
- 손님별 `cafe-stamp:<member_number>` QR 값
- 일반 적립 확인용 스탬프 상태
- 쿠폰 발행 확인용 `stamp_goal - 1` 스탬프 상태

초기 데이터는 수동 입력에 의존하지 않도록 SQL 또는 명확한 절차로 복원할 수 있게 유지합니다. 파일럿 계정의 실제 비밀번호나 운영 URL에 연결된 민감한 값은 문서에 직접 적지 않습니다.

## QR과 스캐너 입력 검증

QR은 적립을 바로 실행하지 않고 회원번호 입력을 줄이는 용도입니다.

- 손님 화면은 `cafe-stamp:<member_number>` 형식의 QR을 표시합니다.
- 사장님 화면은 회원번호 입력창에 포커스를 둡니다.
- 스캐너가 키보드처럼 QR 값을 입력하면 접두어를 제거해 회원번호로 조회합니다.
- 스캐너가 Enter를 보내면 고객 조회를 실행합니다.
- 고객 조회 결과를 확인한 뒤 사장님이 직접 적립 버튼을 누릅니다.

실제 스캐너가 없을 때는 입력창에 `cafe-stamp:<member_number>`를 붙여넣고 Enter를 눌러 같은 흐름을 검증합니다. 브라우저 카메라 QR 인식, POS 연동, 스캐너 장비 설정은 이번 MVP 개발 범위가 아닙니다.

## 일반적인 작업 흐름

1. `AGENTS.md`, `docs/PRODUCT.md`, `ARCHITECTURE.md`, `docs/DEVELOPMENT.md`를 확인합니다.
2. 관련 기획 문서와 현재 코드를 읽습니다.
3. 필요한 범위만 작게 수정합니다.
4. 새 라이브러리는 실제 필요가 있을 때만 추가합니다.
5. `npm run verify`를 실행합니다.
6. 개발 서버 시작 가능 여부가 필요한 작업이면 `npm run dev`로 확인합니다.
7. 변경 파일과 검증 결과를 보고합니다.
