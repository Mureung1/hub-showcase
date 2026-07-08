# scripts/

arXiv 논문 **수집**과 LLM(Gemini Flash) 한국어 **요약** 파이프라인(Python) 코드가 위치하는 곳.

매일 GitHub Actions cron이 이 스크립트를 실행해 최신 LLM 논문을 fetch·요약하고, 결과를 `../data/`에 JSON으로 저장한다.
