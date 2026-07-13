import os
from dotenv import load_dotenv

load_dotenv()

# Wevity 크롤링 설정
BASE_URL = "https://www.wevity.com"
USER_AGENT = "naver-challenge-crawler (contact: khy05300@gmail.com)"
CRAWL_DELAY = 1.5  # 요청 간 딜레이 (초)
MAX_PAGES = 10  # 최대 페이지 수

# 크롤링 대상 섹션
SECTIONS = [
    {"name": "공모전", "path": "?c=find&s=1"},
    {"name": "대외활동", "path": "?c=active&s=1"},
]

# 데이터베이스 설정
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL 환경변수가 설정되지 않았습니다")

# 로깅 설정
LOG_LEVEL = "INFO"
