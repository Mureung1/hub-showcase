# Task Packet: SCENE-002~004

## 1. Summary

```text
Task: 360/사진 업로드부터 Gaussian Splat viewer까지 자동화
Backlog ID: SCENE-002 / SCENE-003 / SCENE-004
Parent Epic: EPIC-05
Type: feature
Owner: N187_정현우
Status: in_progress
```

## 2. Goal

사용자가 360 영상 또는 사진을 올리면 입력 검증, 전처리, COLMAP, Splatfacto 학습, PLY export와 web viewer 연결을 하나의 추적 가능한 job으로 처리한다.

## 3. Scope

포함:

```text
images/video/equirectangular images/video upload
고정 allowlist 확장자, 크기, hash와 안전한 파일명
Nerfstudio ns-process-data → ns-train splatfacto → ns-export gaussian-splat
toolchain/GPU readiness와 blocked reason
job.json, stage status, command log와 PLY asset endpoint
Spark + Three.js viewer
```

제외:

```text
2GB GPU에서 학습 성공을 가장하는 fallback
무제한 업로드와 공개 익명 upload service
임의 shell command 실행
사람 얼굴 익명화 완료 전 외부 공개
```

## 4. Related Documents

```text
docs/features/3d-congestion-explorer.md
docs/features/person-anonymization-preprocessing.md
docs/development/architecture.md
```

## 5. Expected Changes

```text
api: upload/job/toolchain/asset endpoint와 fixed command pipeline
web: upload state와 Spark PLY viewer
tests: validation, command, blocked state, upload contract
docs: hardware gate와 운영 절차
```

## 6. Acceptance Criteria

- [x] 허용된 360/일반 이미지·영상만 안전한 job directory에 저장된다.
- [x] input hash, file size와 stage 상태가 job.json에 남는다.
- [x] equirectangular 입력이 Nerfstudio 공식 option으로 분할된다.
- [x] 학습과 export command가 사용자 입력을 shell로 해석하지 않는다.
- [x] tool/GPU 부족 시 정확한 blocked reason과 다음 명령을 반환한다.
- [ ] PLY asset이 준비되면 Spark viewer에서 열 수 있다.
- [x] API와 Front test/build가 통과한다.
- [x] 표준 Gaussian PLY로 Spark canvas nonblank 렌더링을 검증한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest
uv run --directory product/apps/api ruff check .
pnpm --dir product/apps/web test
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
```

수동 확인:

```text
toolchain endpoint에서 MX450 2GB와 missing Nerfstudio 표시
작은 sample upload 후 uploaded → blocked 상태 확인
준비된 PLY URL을 제공했을 때 canvas nonblank 확인
```

## 8. Documentation Updates

- [x] pipeline과 state diagram 기록
- [x] GPU worker 필수 tool과 VRAM 제한 기록
- [x] Run Report 작성

## 9. Commit Plan

```text
feat(scene): automate Gaussian Splat scene jobs
```

## 10. Self-check

- [x] 이 PC에서 실행하지 못한 학습을 완료라고 표현하지 않았는가?
- [x] upload path traversal과 임의 command 입력을 막았는가?
- [x] 원본 촬영물 공개 범위와 익명화 gate를 유지했는가?
- [ ] 후속: GPU worker에서 실제 capture 1건을 학습한다.
