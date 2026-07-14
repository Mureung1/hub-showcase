# Photo Navigation

지도에서 포토스팟과 원하는 프레임을 고르고, 촬영 과정에서 구도를 안내하는 포토 내비게이션 서비스입니다.

## Directory Guide

- `apps/web`: 실제 React 프론트엔드 개발 공간
- `apps/api`: 실제 Express 백엔드 개발 공간
- `prototype`: 기획과 사용자 흐름을 검증한 기존 프로토타입
- `docs`: 아키텍처, 작업 흐름, Agent 지침

## Project Management

- [GitHub Issues](https://github.com/yf560/hub/issues)
- [GitHub Project](https://github.com/users/yf560/projects/2)
- Planning Agent: 작업 시작 전 다음 Task와 완료 기준을 정리합니다.
- Verification Agent: 구현 후 요구사항과 예외 상태를 점검합니다.

## Overlay Agent

`tools/overlay-agent` creates a transparent camera guide PNG from a reference photo and normalized coordinate JSON.

```bash
cd tools/overlay-agent
npm install
npm run generate -- --image <reference-image> --guide ./guides/example-guide.json --output <overlay-output>
```

Place reference photos in `assets/photo-guides/reference/` and review generated PNG files before uploading them to Storage.
