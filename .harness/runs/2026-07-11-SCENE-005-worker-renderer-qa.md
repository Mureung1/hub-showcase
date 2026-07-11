# Run Report: SCENE-005 worker and renderer QA

## Summary

```text
Task: SCENE-005
Status: passed with external follow-up
Date: 2026-07-11
```

## Worker Verification

```text
mode: docker
image: ghcr.io/nerfstudio-project/nerfstudio:1.1.5
docker: available
nvidia-smi: available
GPU: NVIDIA GeForce MX450, 2048MB
blockers: missing_docker_image, gpu_memory_below_minimum
```

Docker command adapter test:

```text
host job path -> /workspace
--gpus all
--shm-size=12gb
job directory만 volume mount
shell=False argument list 유지
```

## Renderer Verification

```text
fixture: synthetic binary_little_endian Gaussian PLY
splat count: 330
bounds: -1.350,-2.490,0.000 .. 1.350,-0.150,0.000
desktop canvas: 920x388
sampled pixels: 22,310
non-background pixels: 5,896 (26.43%)
RGB range: R 11..246, G 21..246, B 13..239
pixel gate: nonblank pass
mobile: 390x844, viewer 342x388, document width 390, overflow 없음
```

## Test Result

```text
API: 29 passed, Ruff passed
Front: 4 passed, lint/build passed
```

## Known Limitations

```text
renderer QA는 synthetic 표준 PLY로 수행했다.
현재 GPU에서는 실제 Splatfacto 학습을 실행할 수 없다.
실제 capture의 reconstruction 품질과 익명화 결과는 아직 검증하지 않았다.
```

## Next Action

```text
CUDA VRAM 6GB 이상 worker에서 image를 pull한다.
실제 관평동 capture 1건을 upload -> preprocess -> train -> export한다.
같은 Spark viewer에서 실제 PLY pixel과 OrbitControls 이동 범위를 확인한다.
```
