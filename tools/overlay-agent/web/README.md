# Local Vision Overlay Studio

기존 Before/After 화면에서 로컬 YOLO와 SAM2를 사용해 1인 또는 커플의 정밀 윤곽을 생성합니다. 관리자는 After 캔버스에서 고정된 건물·무대 구조를 최대 5개의 배경선으로 직접 등록할 수 있습니다. 사진은 이 PC의 로컬 서버에서 처리되며 외부 Vision API로 전송되지 않습니다.

## First-time setup

```powershell
cd tools/overlay-agent
.\start-yolo-sam2-studio.ps1
```

스크립트가 FastAPI와 Vite를 함께 실행합니다. Vite가 출력하는 로컬 주소를 브라우저에서 엽니다. 최초 준비는 `tools/yolo-sam2-overlay/README.md`를 따릅니다.

`setup-models`는 무료 MediaPipe Pose Landmarker 모델과 MediaPipe WASM을 로컬 폴더에 준비합니다. 이 단계에서만 인터넷 연결이 필요합니다.

## Use

1. JPG, PNG 또는 WebP 사진을 선택합니다.
2. `1인` 또는 `커플` 모드를 선택합니다.
3. `AI 레이아웃 생성`을 누릅니다.
4. `선 등록`을 누르고 After 이미지에서 시작점·끝점을 클릭해 배경선을 최대 5개 등록합니다. `되돌리기`는 임시 시작점 또는 가장 최근 선을 취소합니다.
5. Overlay 투명도를 조정합니다.
6. 투명 Overlay PNG 또는 layout JSON을 다운로드합니다.

## 촬영 구도 비교

`/background-editor/`는 30개 데이터셋 사진의 기존 layout JSON을 불러와 배경선을 선택·등록·수정·저장합니다. 저장 시 같은 ID의 layout JSON과 Overlay PNG를 덮어씁니다.

`/compare/` 페이지는 `예시 사진 + layout JSON + 촬영 사진`을 받아 다음을 비교합니다.

- YOLO/SAM2 기반 인물 수, 화면 위치, 크기
- 사람 영역을 제외한 ORB 특징점 정합과 관리자가 등록한 배경선의 위치·각도

배경 정합에 충분한 특징점을 찾지 못하면 잘못된 점수 대신 `분석 제한`을 반환합니다. 두 사진은 FastAPI의 임시 폴더에서만 처리되고 분석이 끝나면 삭제됩니다.

## 앱에 붙일 때

분석 코드는 `src/features/vision-overlay/`에 분리되어 있습니다. 이후 포토스팟 상세나 카메라 화면에서는 `analyzePhotoLayout({ file, image, mode, onProgress })`만 호출해 같은 layout JSON 결과를 받아 사용할 수 있습니다. Python API는 `/api/analyze`에서 정규화된 인물 윤곽 좌표를 반환합니다.

## GitHub Pages 배포

GitHub Pages에서는 Python 모델 서버를 실행할 수 없으므로 기존 MediaPipe 브라우저 분석을 사용합니다. YOLO/SAM2 배포판은 이후 GPU 또는 CPU 서버에 FastAPI를 별도로 배포한 뒤 API 주소를 연결해야 합니다.
