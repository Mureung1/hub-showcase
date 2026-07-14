# Codex 작업 지침

## 프로젝트 목적

이 저장소는 여러 개인 카페의 스탬프를 손님용 모바일 웹과 사장님용 넓은 화면 웹에서 확인하고 적립하는 MVP입니다. 현재 코드는 정적 데모 화면에 가까우며, 기획 문서에는 향후 Supabase 기반 인증과 데이터 연동 범위가 정리되어 있습니다.

## 현재 기술 스택

- React 19
- Vite 8
- JavaScript와 JSX
- CSS
- Oxlint
- npm

## 먼저 읽을 문서

작업 전 아래 문서를 먼저 확인합니다.

- `docs/PRODUCT.md`
- `ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/service-plan.md`
- `checklist.md`

## 실제 명령

Windows PowerShell에서는 `npm.ps1` 실행 정책에 막힐 수 있으므로 필요하면 `cmd /c`를 붙입니다.

```bash
npm install
npm run dev
npm run lint
npm run build
npm run verify
```

PowerShell에서 문제가 생기면 다음처럼 실행합니다.

```powershell
cmd /c npm run verify
```

## 주요 디렉터리

- `src/`: 현재 React 앱 코드
- `src/assets/`: 앱에서 쓰는 이미지 자산
- `docs/`: 제품과 개발 문서, 기획 참고 자료
- `public/`: 정적 공개 파일
- `skills/cafe-stamp-design-system/`: 프로젝트 디자인 시스템 스킬
- `dist/`: 빌드 산출물이며 커밋 대상이 아님

## 기존 코드와 디자인 보호 규칙

- 제품 기능 요청 없이 기존 UI와 화면 흐름을 바꾸지 않습니다.
- 프로토타입 HTML/CSS와 기존 React 화면은 디자인 참고 자료로 보존합니다.
- 새 라이브러리는 실제 필요가 확인될 때만 추가합니다.
- JavaScript/JSX를 유지하고 TypeScript 전환은 별도 합의 전에는 하지 않습니다.
- Supabase, 인증, 데이터베이스 구조는 구현 요청 전까지 문서에 임의로 확정하지 않습니다.

## 브랜치와 커밋 원칙

- 한 브랜치에는 하나의 주요 목적만 포함합니다.
- 서로 다른 기능, 문서 정리, 도구 설정을 한 브랜치에 섞지 않습니다.
- 구현 후에는 `npm run verify`를 실행합니다.
- 사용자의 명시적 요청 없이 `git commit`, `git push`, Pull Request 생성, merge를 수행하지 않습니다.

## Superpowers 사용

설계, 계획, 테스트 주도 개발, 디버깅, 완료 검증에는 설치된 Superpowers 스킬을 사용합니다. 세부 절차는 스킬이 담당하므로 이 파일에는 프로젝트 고유 규칙만 기록합니다.
