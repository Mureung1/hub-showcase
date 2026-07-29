"""생성 데이터 시드 빌더.

각 직무 모듈이 ``build() -> dict[str, list[dict]]`` 를 내보내고
``agent/scripts/build_demo_seed.py`` 가 조각을 합쳐 테이블별 CSV 를 만든다.

데이터베이스에 접속하지 않는다. 조회도 하지 않는다.
"""
