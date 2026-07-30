# 사용 기술

## 프론트엔드

React를 사용한다.

## 백엔드

FastAPI(0.139.0)를 사용한다. API 요청·응답 검증에 Pydantic을 사용하고, 콘텐츠 수집과 필터링을 Python 모듈로 구성하기 용이해 선택했다.

## 데이터베이스

Supabase의 PostgreSQL 17을 사용한다. 수집 콘텐츠(소스/태그/발행일)와 사용자 미션 기록을 관계형으로 관리하기 적합해 채택했다.

## 콘텐츠 수집

HTTP 수집은 `httpx`, RSS/Atom 파싱은 `feedparser`를 사용한다. 현재 MVP는 운영자가 다중 source CLI를 수동 실행하며 APScheduler/Celery 같은 scheduler는 사용하지 않는다. 자동 실행은 영속 실행 이력, 실패 알림과 중복 실행 잠금이 필요해 후속 후보로 둔다.
