## 📋 프로젝트 기획서

- 🔗 [프로젝트 상세 기획서 (Wiki)](https://github.com/shyang0319/hub/wiki/%5BN111_%EC%96%91%EC%84%9C%ED%98%95%5D-WeatherPilot(%EC%9B%A8%EB%8D%94%ED%8C%8C%EC%9D%BC%EB%9F%BF)-%EC%84%9C%EB%B9%84%EC%8A%A4-%EA%B8%B0%ED%9A%8D%EC%95%88)

## 구현 노트

- **LLM 제안 생성**: 현재 **Groq**(무료·OpenAI 호환, `llama-3.3-70b-versatile`)을 사용한다. 문서 원안은 Claude API이며, provider를 분리 설계해 교체 가능하다(`apps/server/src/agent/generate.ts`의 `LLMCaller`).

## 참고 문서

- 기획서: @docs/WeatherPilot_기획안.md
- 기술 로드맵·아키텍처·검증: @docs/WeatherPilot_기술로드맵.md
- 개발 백로그(Task): @docs/WeatherPilot_백로그.md
