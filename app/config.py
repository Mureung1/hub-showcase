"""환경변수·상수. 매직넘버는 전부 여기로 모은다."""

import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.0-flash"

# 3단계(요약)↔4단계(자기 검증) 최대 왕복 횟수. 없으면 무한 루프로 API 비용이 탄다.
MAX_RETRY = 2

# 요약(summarize) 응답이 JSON 파싱에 실패했을 때 같은 프롬프트로 재시도할 횟수
# (summarize.md의 "fallback 3회 파싱 실패 시" 규정). MAX_RETRY(검증 왕복)와는 다른 개념.
SUMMARIZE_PARSE_ATTEMPTS = 3

# 개발 중 기본 논문 수. 무료 티어 한도 보호 (CLAUDE.md 비밀·외부 API 규칙).
DEFAULT_LIMIT = 3

ARXIV_CATEGORIES = ["cs.CL", "cs.AI", "cs.LG"]
