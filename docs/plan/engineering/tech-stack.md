# 사용 기술

## 프론트엔드

React를 사용한다.

## 백엔드

FastAPI(0.139.0)를 사용한다. RSS/API 주기 수집에 필요한 스케줄링(APScheduler/Celery)과 데이터 검증(Pydantic)이 표준 패턴으로 갖춰져 있고, 이후 콘텐츠 필터링을 텍스트 분석으로 고도화할 때 Python 생태계 확장이 유리해서 선택했다.

## 데이터베이스

PostgreSQL(18.4)을 사용한다. 수집 콘텐츠(소스/태그/발행일)와 사용자 미션 기록을 관계형으로 관리하기 적합해 채택했다.

## 콘텐츠 수집

RSS 파싱과 스케줄러(FastAPI 생태계, feedparser + APScheduler 등)를 사용한다.
