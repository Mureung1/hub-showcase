# Run Report: SCENE-002~004 Gaussian Splat pipeline

## Summary

```text
Task: SCENE-002 / SCENE-003 / SCENE-004
Status: partial
Date: 2026-07-11
```

## Scope

```text
360/일반 영상·사진 upload와 안전한 file-backed job을 구현했다.
Nerfstudio preprocess, Splatfacto train과 Gaussian PLY export 명령을 고정했다.
GPU/tool readiness, stage status, retry와 asset endpoint를 구현했다.
제품 웹에 실제 upload 상태와 lazy-loaded Spark/Three.js viewer를 연결했다.
```

## Verification

```powershell
uv run --directory apps/api ruff format --check .
uv run --directory apps/api ruff check .
uv run --directory apps/api pytest
pnpm --dir apps/web test
pnpm --dir apps/web lint
pnpm --dir apps/web build
python scripts/check_docs_html.py
python scripts/check_task_packet.py --root .
```

Result:

```text
API: 26 passed, Ruff format/check passed.
Front: 4 passed, lint와 TypeScript/Vite production build passed.
Docs link와 14개 Task Packet check passed.
Spark는 asset-ready 화면에서만 lazy chunk로 분리됐다.
```

Actual upload smoke:

```text
PNG 1개 upload: HTTP 200
stored job: blocked
validate: passed
preprocess: blocked
reason: missing ns-process-data/ns-train/ns-export, GPU memory below minimum
temporary job directory: removed after verification
```

Browser result:

```text
Desktop: upload, GPU 상태, 네 단계, 시간 선택과 privacy gate 표시 확인
390x844: document 375px, modal 375px, horizontal overflow 없음
empty submit: 촬영 파일 선택 안내 표시
console warning/error: 없음
```

## Known Limitations

```text
현재 PC의 NVIDIA GeForce MX450은 2048MB이고 최소 기준 6000MB보다 작다.
Nerfstudio toolchain도 설치되지 않아 실제 학습과 PLY export는 실행하지 못했다.
따라서 실제 capture의 nonblank Spark canvas와 익명화 결과는 아직 검증하지 않았다.
Vercel 정적 배포만으로는 FastAPI/CUDA worker를 실행할 수 없다.
```

## Next Action

```text
CUDA 6000MB 이상 worker에 Nerfstudio를 설치한다.
관평동 실제 capture 1건을 학습하고 PLY canvas pixel과 이동 범위를 확인한다.
얼굴·차량번호 익명화 gate를 통과한 asset만 공개 storage로 승격한다.
```
