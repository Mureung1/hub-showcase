# agent-worker — 미리캣 조사 에이전트

미리캣의 조사 에이전트(Python 워커). API 서버(Express)와 분리되어 동작한다.

**현재(MIRI-12):** 공지 원문 → LangGraph 그래프 → 구조화 JSON 추출 (노드 1개짜리 최소 그래프).

## 구성
- `graph.py` — LangGraph 그래프 (State / extract 노드 / compile / run)
- `schema.py` — 추출 결과 스키마 (Pydantic, 평가셋 5필드와 1:1)
- `prompt.py` — 추출 프롬프트 v1 (예측 금지·원문 사실만)

## 실행
```bash
# 1) 가상환경·패키지 (최초 1회)
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2) miricat/.env 에 키 추가 (https://aistudio.google.com/apikey)
#    GEMINI_API_KEY=...

# 3) 실행
.venv/bin/python graph.py
```
→ `docs/eval-dataset/wonchon-0330` 공지를 추출해 JSON으로 출력하고 ground_truth와 대조한다.

## 모델
Gemini (`google-genai`). `graph.py`의 `MODEL` 상수로 교체 가능. 사용 가능 모델 조회:
```bash
.venv/bin/python -c "from google import genai; import os; \
[print(m.name) for m in genai.Client(api_key=os.environ['GEMINI_API_KEY']).models.list() \
 if 'generateContent' in (m.supported_actions or [])]"
```

## 다음 (MIRI-13~)
Scout(실제 게시판 수집) · Verifier(추출 자기검증 → 실패 시 Scout로 되돌아가는 재시도 루프) · Analyst · Reporter 노드를 이 그래프에 붙인다.
