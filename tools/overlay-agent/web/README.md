# Local Vision Overlay Studio

기존 Before/After 화면에서 로컬 YOLO와 SAM2를 사용해 1인 또는 커플의 정밀 윤곽과 수평 가이드를 생성합니다. 사진은 이 PC의 로컬 서버에서 처리되며 외부 Vision API로 전송되지 않습니다.

## First-time setup

```powershell
cd tools/overlay-agent
.\start-yolo-sam2-studio.ps1
```

스크립트가 FastAPI와 Vite를 함께 실행합니다. Vite가 출력하는 로컬 주소를 브라우저에서 엽니다. 최초 준비는 `tools/yolo-sam2-overlay/README.md`를 따릅니다.

`setup-models`는 무료 MediaPipe Pose Landmarker 모델과 MediaPipe WASM을 로컬 폴더에 준비합니다. 이 단계에서만 인터넷 연결이 필요합니다. 배경선은 브라우저 Canvas의 가벼운 대비 분석으로 생성해, 별도 API나 무거운 런타임 없이 안정적으로 동작합니다.

## Use

1. JPG, PNG 또는 WebP 사진을 선택합니다.
2. `1인` 또는 `커플` 모드를 선택합니다.
3. `AI 레이아웃 생성`을 누릅니다.
4. 프레임 크기, 수평선, 투명도를 조정합니다.
5. 투명 Overlay PNG 또는 `guide.json`을 다운로드합니다.

## 앱에 붙일 때

분석 코드는 `src/features/vision-overlay/`에 분리되어 있습니다. 이후 포토스팟 상세나 카메라 화면에서는 `analyzePhotoLayout({ file, image, mode, onProgress })`만 호출해 같은 `guide.json` 결과를 받아 사용할 수 있습니다. Python API는 `/api/analyze`에서 정규화된 인물 윤곽 좌표를 반환합니다.

## GitHub Pages 배포

GitHub Pages에서는 Python 모델 서버를 실행할 수 없으므로 기존 MediaPipe 브라우저 분석을 사용합니다. YOLO/SAM2 배포판은 이후 GPU 또는 CPU 서버에 FastAPI를 별도로 배포한 뒤 API 주소를 연결해야 합니다.
