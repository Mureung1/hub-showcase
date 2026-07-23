# showcase 작성 안내

1. `showcase.example.json`을 복사해 `showcase.json`을 만듭니다.
2. 프로젝트 내용과 AI 협업 내용을 작성합니다.
3. 이미지는 아래 구조로 넣습니다.

```text
showcase/
├── showcase.json
├── thumbnail.webp
└── screenshots/
    └── home.webp
```

이미지 경로는 `showcase.json` 기준으로 적습니다.

```json
{
  "thumbnail": "thumbnail.webp",
  "screenshots": ["screenshots/home.webp"]
}
```

`agentTools`에는 Agent와 Skill을 함께 적고, `workflows`에는 개발 순서를 적습니다.
