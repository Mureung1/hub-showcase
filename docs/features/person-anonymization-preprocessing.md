# 기능 스펙: 사람 영역 익명화 전처리

## 1. 기능 구분

```text
구분: 보조/추가기능
우선순위: P1
```

이 기능은 공개 영상 서비스를 만들기 위한 기능이 아니다. 정적인 3D map 생성을 위한 입력 이미지에서 사람 영역과 개인정보 노출 위험을 줄이는 전처리 기능이다.

## 2. 목표

```text
3D 복원용 이미지/프레임에서 사람으로 보이는 영역을 찾아,
별도 전처리 프로그램에서 blur, mask, 또는 프레임 제외 처리를 수행한다.
```

## 3. 모델 역할

v0.1에서 모델은 사람 여부를 이진분류하는 모델이 아니라, 사람 후보 영역을 찾는 경량 object detection 모델로 둔다.

```text
입력: 이미지 프레임
출력: person bounding box 목록
```

모델은 처리 결정을 직접 하지 않는다. 모델은 bbox를 제공하고, 후처리 프로그램이 익명화 정책을 적용한다.

## 4. MoE 여부

이 기능은 MoE로 정의하지 않는다.

MoE는 일반적으로 여러 expert 모델 중 일부를 router가 선택해 사용하는 구조다. 이 기능은 단일 경량 detector와 별도 전처리 프로그램으로 구성되므로 다음처럼 표현한다.

```text
lightweight person detection + preprocessing anonymization pipeline
```

한국어 설명:

```text
경량 사람 탐지 모델 기반 익명화 전처리 파이프라인
```

## 5. 처리 흐름

```text
촬영 영상 또는 이미지
→ 프레임 추출
→ 경량 person detector 실행
→ person bbox 생성
→ bbox 확장 margin 적용
→ blur / mask / frame exclude 중 하나 선택
→ 정제 이미지 저장
→ 3D reconstruction 입력으로 사용
```

## 6. 처리 정책

### A. 기본 정책

```text
사람이 적은 시간에 3D 복원용 촬영을 먼저 수행한다.
person bbox가 작고 장면 품질에 영향이 적으면 blur 또는 mask 처리한다.
person bbox가 크거나 장면 중심을 많이 가리면 해당 프레임을 제외한다.
원본 영상은 공개하지 않는다.
```

### B. bbox 처리

```text
bbox 주변에 margin을 추가한다.
margin 적용 후 blur 또는 solid mask를 적용한다.
얼굴이 작더라도 공개 산출물에는 원본 프레임을 쓰지 않는다.
```

### C. 3D 복원 품질 우선순위

```text
1순위: 사람 적은 시간에 촬영한다.
2순위: 사람 bbox가 큰 프레임은 제외한다.
3순위: 필요한 경우 bbox blur/mask를 적용한다.
4순위: v0.2 이후 segmentation으로 사람 영역을 더 정교하게 처리한다.
```

## 7. 입력

```text
video_path 또는 image_dir
output_dir
detector_model_path
confidence_threshold
bbox_margin
action: blur / mask / exclude
```

## 8. 출력

```text
정제된 이미지 디렉터리
탐지 결과 metadata 파일
제외된 프레임 목록
전처리 요약 리포트
```

metadata 예시:

```json
{
  "frame": "frame_000123.jpg",
  "detections": [
    {
      "class": "person",
      "confidence": 0.87,
      "bbox": [120, 80, 260, 430],
      "action": "blur"
    }
  ]
}
```

## 9. v0.1 완료 기준

```text
이미지 프레임에서 person bbox를 탐지할 수 있다.
탐지된 bbox에 margin을 적용할 수 있다.
blur, mask, exclude 중 하나의 처리 방식을 적용할 수 있다.
정제된 이미지를 별도 디렉터리에 저장할 수 있다.
탐지/처리 metadata를 저장할 수 있다.
정제된 이미지를 3D reconstruction 입력으로 사용할 수 있다.
```

## 10. 제외 범위

```text
실시간 온디바이스 추론
서비스 화면에서 실시간 영상 블러
사람 identity tracking
정교한 pose estimation
3D 사람 오브젝트 자동 생성
MoE 구조
```

## 11. 향후 확장

```text
v0.2: YOLO small/nano 계열 자동 탐지 적용
v0.2: 번호판 탐지와 blur 추가
v0.3: instance segmentation 기반 사람 영역 정교화
v0.3: 동적 객체 제거 품질 리포트 추가
v0.4: 익명 실루엣 또는 3D proxy object 대체 실험
```
