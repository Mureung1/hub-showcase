# Task Packet: SCENE-005

## 1. Summary

```text
Task: Docker GPU worker와 Spark renderer QA
Backlog ID: SCENE-005
Parent Epic: EPIC-05
Type: feature / verification
Owner: N187_정현우
Status: done
```

## 2. Goal

Nerfstudio를 host에 직접 설치하지 않아도 공식 Docker image로 scene job을 실행할 수 있게 하고, Spark viewer가 Gaussian PLY를 실제 nonblank canvas로 렌더링하는지 독립 검증한다.

## 3. Scope

포함:

```text
host/docker worker mode
Nerfstudio 1.1.5 image pin
job directory only volume mount
GPU/tool/image blocker
binary Gaussian PLY smoke fixture generator
desktop/mobile Spark canvas pixel QA
```

제외:

```text
현재 MX450 2GB에서 학습 강행
synthetic fixture를 실제 촬영 scene으로 표시
Nerfstudio image를 production web bundle에 포함
```

## 4. Related Documents

```text
docs/features/3d-congestion-explorer.md
docs/development/architecture.md
docs/development/environment.md
```

## 5. Expected Changes

```text
api: worker mode, image readiness와 docker command adapter
web: renderer error/diagnostic boundary와 smoke page
scripts: synthetic binary Gaussian PLY generator
docs: 실행 명령, 검증 결과와 실제 capture 잔여 항목
```

## 6. Acceptance Criteria

- [x] worker가 host와 docker mode를 구분한다.
- [x] Docker 명령은 job directory만 `/workspace`에 mount한다.
- [x] tool, image와 GPU 부족 blocker를 구분한다.
- [x] Spark가 binary Gaussian PLY 330개를 읽는다.
- [x] desktop canvas가 nonblank pixel gate를 통과한다.
- [x] 390px mobile에서 horizontal overflow 없이 렌더링한다.
- [x] smoke fixture는 제품 asset으로 commit하지 않는다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest
pnpm --dir product/apps/web test
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
python product/scripts/build_splat_smoke_fixture.py
```

## 8. Documentation Updates

- [x] Docker worker 환경 변수와 pull 명령을 기록했다.
- [x] canvas pixel 결과를 Run Report에 기록했다.
- [x] synthetic renderer QA와 실제 capture 검증을 구분했다.

## 9. Commit Plan

```text
feat(scene): add a reproducible GPU worker path
test(scene): verify the Spark canvas with Gaussian splats
```

## 10. Self-check

- [x] Docker command가 shell 문자열을 실행하지 않는가?
- [x] synthetic scene을 실제 촬영 결과라고 부르지 않았는가?
- [x] canvas 존재가 아니라 pixel 변화를 확인했는가?
- [ ] 후속: CUDA 6GB 이상 worker에서 실제 capture 1건을 처리한다.
