# Run Report: SCENE-002 anonymization sample pipeline

## Scope

이미지 sample에서 사람 후보 영역을 탐지하고 익명화된 별도 학습 입력을 만드는
P1 sample pipeline을 검증했다. 실제 사용자 촬영 360 영상의 GPU 학습은 이 report의
범위가 아니다.

## Verified behavior

- blur 정책은 원본을 바꾸지 않고 margin이 적용된 대상 영역만 흐린 결과 파일을 만든다.
- mask 정책은 대상 영역을 마스킹한다.
- exclude 정책은 대상 frame을 학습 입력에서 제외한다.
- 모든 frame이 제외되면 train 단계로 진행하지 않는다.
- pipeline train command는 `processed/`가 아닌 `anonymized/`를 사용한다.

## Commands

```powershell
uv run --directory apps/api --extra scene pytest tests/test_scene_anonymization.py tests/test_scene_pipeline.py
uv run --directory apps/api --extra scene ruff check src/localtwin_api/scene_anonymization.py src/localtwin_api/scene_pipeline.py tests/test_scene_anonymization.py
```

## Result

2026-07-26 기준 targeted pytest 15개와 Ruff 검사가 통과했다.

## Remaining boundary

SCENE-007에서 승인된 실제 촬영 입력 1건으로 anonymize → GPU train → viewer 경로를
별도로 검증한다. 이 sample 검증만으로 실제 촬영 end-to-end를 완료라고 표현하지 않는다.
