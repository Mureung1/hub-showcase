# ICU Curriculum Data Schema

모든 트랙(`frontend.json`, `backend.json`, `fullstack.json`, `devops.json`, `software-engineer.json`)은 동일한 구조를 따릅니다.

```
{
  "trackId": "frontend",
  "trackName": "프론트엔드 개발자",
  "description": "...",
  "totalLevels": 4,
  "levels": [
    {
      "levelId": "fe-01",
      "levelNumber": 1,
      "title": "레벨 제목",
      "goal": "이 레벨을 마치면 할 수 있게 되는 것 (한 문장)",
      "estimatedWeeks": 3,
      "modules": [
        {
          "moduleId": "fe-01-01",
          "title": "모듈 제목",
          "topics": ["토픽1", "토픽2", "..."],
          "practiceIdeas": ["실습 아이디어1", "실습 아이디어2"],
          "resources": [
            { "label": "표시 이름", "url": "공식 문서 URL", "type": "official-doc" }
          ]
        }
      ]
    }
  ]
}
```

## 설계 원칙 (저작권 안전)

- **구조(레벨/순서/모듈명/토픽명)는 전부 직접 설계** — roadmap.sh 등 특정 사이트의 트리 구조를 그대로 베끼지 않음.
- **resources는 링크만 제공** — 원문 텍스트를 절대 복제하지 않고, MDN / 공식 언어·프레임워크 문서 / 표준 사양 문서 등 라이선스가 명확한(CC-BY-SA 또는 공식 오픈 문서) 소스만 연결.
- **practiceIdeas는 100% 생성 콘텐츠** — 특정 강의/책의 실습 문제를 가져오지 않음.
- 에이전트가 이 JSON을 RAG에 넣거나 프롬프트 컨텍스트로 쓸 때, `resources.url`은 "더 알아보기" 링크로만 노출하고 원문을 크롤링해 재게시하지 않는 것을 권장.

## 확장 방법

- 새 레벨/모듈 추가 시 `moduleId`는 `{trackId 약어}-{레벨번호 2자리}-{모듈순번 2자리}` 규칙 유지.
- 사용자 진단(레벨 테스트) 결과에 따라 에이전트가 `levels` 배열의 특정 인덱스부터 시작하도록 매핑 가능.
