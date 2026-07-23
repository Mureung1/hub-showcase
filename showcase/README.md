# showcase 제출물

[showcase.json 작성 가이드](https://connect-aiagentchallenge-26-1.github.io/hub/guide/) 기준.

```
showcase/
├── showcase.json      # 작성 완료 (스키마 검증 통과)
├── thumbnail.webp     # 필요 — 대표 이미지
└── screenshots/
    ├── deal-list.webp # 필요 — 소비자 딜 목록(M2)
    └── pickup.webp    # 필요 — 사장님 픽업 확인(W4)
```

## 이미지 캡처 방법

`npm run dev` 후 아래 화면을 캡처해 `.webp`로 저장한다. 파일명은 `showcase.json`의
`thumbnail`·`screenshots` 값과 정확히 일치해야 한다.

| 파일 | 화면 | 경로 |
|---|---|---|
| `screenshots/deal-list.webp` | 소비자 딜 목록 (거리·남은 수량·마감 표시) | `/app` (역할 선택 → 소비자) |
| `screenshots/pickup.webp` | 사장님 픽업 확인 결과 | `/owner/pickup` (코드 입력 후) |
| `thumbnail.webp` | 대표 이미지 — 딜 목록 화면 권장 | `/app` |

시연 데이터가 없으면 `npm run seed -w server`로 채운다.
PNG로 캡처했다면 webp로 변환하거나, `showcase.json`의 확장자를 `.png`로 맞춘다
(가이드는 webp/png/jpg/jpeg를 모두 허용한다).
