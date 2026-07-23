# Local Vision Overlay Studio

사진을 브라우저 안에서 분석해 1인 또는 커플 인물 프레임, 수평선, 배경 구도선을 자동 생성하는 로컬 웹 도구입니다. 사진은 외부 API나 서버로 전송되지 않습니다.

## First-time setup

```bash
cd tools/overlay-agent/web
npm install
npm run setup-models
npm run dev
```

Vite가 출력하는 로컬 주소를 브라우저에서 엽니다.

`setup-models`는 무료 MediaPipe Pose Landmarker 모델과 MediaPipe WASM을 로컬 폴더에 준비합니다. 이 단계에서만 인터넷 연결이 필요합니다. 배경선은 브라우저 Canvas의 가벼운 대비 분석으로 생성해, 별도 API나 무거운 런타임 없이 안정적으로 동작합니다.

## Use

1. JPG, PNG 또는 WebP 사진을 선택합니다.
2. `1인` 또는 `커플` 모드를 선택합니다.
3. `AI 레이아웃 생성`을 누릅니다.
4. 프레임 크기, 수평선, 투명도를 조정합니다.
5. 투명 Overlay PNG 또는 `guide.json`을 다운로드합니다.

## 앱에 붙일 때

분석 코드는 `src/features/vision-overlay/`에 분리되어 있습니다. 이후 포토스팟 상세나 카메라 화면에서는 `analyzePhotoLayout({ image, mode, onProgress })`만 호출해 같은 `guide.json` 결과를 받아 사용할 수 있습니다. 현재 화면은 그 모듈을 소비하는 독립 Studio UI입니다.

## GitHub Pages 배포

저장소의 `.github/workflows/deploy-overlay-studio.yml` 워크플로가 `week2-project-structure` 브랜치의 Studio 변경을 감지해 모델 자산을 준비하고 기존 Pages의 `overlay-studio/` 경로에 정적 파일을 배포합니다. 배포 주소에서는 Vite 개발 서버를 실행할 필요가 없습니다.
