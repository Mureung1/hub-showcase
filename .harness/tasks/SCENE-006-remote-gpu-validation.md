# Task Packet: SCENE-006

## 1. Summary

```text
Task: GPU 서버 공식 샘플 학습과 로컬 PLY 검증
Backlog ID: SCENE-006
Parent Epic: EPIC-05
Type: feature / verification
Owner: N187_정현우
Status: in progress
```

## 2. Goal

공식 Nerfstudio 다중 시점 `storefront` 샘플을 GPU 서버에서 학습하고, export한 Gaussian PLY를 외부 배포 없이 로컬 Spark viewer로 검증한다.

## 3. Scope

포함:

```text
Nerfstudio storefront 공식 샘플 직접 다운로드
Docker GPU server runner
splatfacto train과 gaussian-splat export
PLY hash/report 생성
로컬 scene job import
```

제외:

```text
샘플 원본 또는 학습 결과의 Git/Vercel 배포
단일 360 panorama를 3D scene으로 오인
서버 credential 저장
```

## 4. Related Documents

```text
docs/features/3d-congestion-explorer.md
docs/development/environment.md
docs/development/tasks.md
```

## 5. Expected Changes

```text
scripts: GPU server validation runner와 local importer
api: Gaussian PLY 형식 검증과 ready job 등록
docs: sample 선택 근거, 서버/로컬 실행 흐름과 검증 한계
```

## 6. Acceptance Criteria

- [x] 공식 샘플은 server가 공식 CLI로 직접 다운로드한다.
- [x] server runner는 Docker workspace 밖을 mount하지 않는다.
- [x] 결과 report에 GPU, image, iteration, PLY hash와 크기를 남긴다.
- [x] 일반 point cloud PLY를 Gaussian PLY로 받지 않는다.
- [x] import한 asset은 기존 scene endpoint와 viewer에서 읽을 수 있다.
- [x] 실제 GPU 서버에서 `storefront` 학습과 PLY export를 완료한다.
- [x] 로컬 Spark viewer에서 실제 export asset의 nonblank canvas를 확인한다.
- [x] Nerfstudio camera pose로 실제 촬영 시점의 초기 화면을 복원한다.

## 7. Verification Plan

```powershell
python product/scripts/run_gpu_scene_validation.py --dry-run
uv run --directory product/apps/api pytest
python scripts/check_task_packet.py --require
```

## 8. Documentation Updates

- [x] 공식 sample과 local-only 원칙을 문서에 반영한다.
- [x] 실제 GPU run report를 추가한다.

## 9. Commit Plan

```text
feat(scene): prepare remote GPU sample validation
```

## 10. Self-check

- [x] source URL과 sample 이름을 기록했는가?
- [x] sample asset을 repository에 넣지 않았는가?
- [x] server credential을 코드나 문서에 넣지 않았는가?
- [x] 실제 서버 GPU와 결과 hash를 검증했다.
- [ ] 후속: 사용자 촬영 360 영상 또는 다중 시점 사진 1건으로 같은 경로를 검증한다.
