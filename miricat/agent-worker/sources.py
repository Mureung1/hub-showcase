"""수집 소스 설정 (MIRI-13 단계 1). 로직 없음 — scout.py가 이 설정을 읽어 긁는다.

각 소스: 목록 URL / 글 식별자를 뽑는 정규식 / 본문(view) URL 틀 / 활성 여부.
소스 추가 = 여기 dict 하나 추가 (scout.py는 안 건드림).

수집 매너: 하루 1회, 요청 간격 1~2초, 브라우저 UA, 이미 본 글 스킵.
학습용 저빈도 수집. 실서비스라면 공식 API/협의로 전환할 지점.
"""

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
}
REQUEST_DELAY_SEC = 1.5      # 글마다 텀
MAX_ITEMS_PER_RUN = 5        # 소스별 최근 N건만 (부하·쿼터 상한)

SOURCES = [
    {
        "id": "daejeon_bus",
        "name": "대전시버스운송사업조합 공지사항",
        "active": True,                     # ← 오늘 실제로 쓰는 소스 (파싱 검증 완료)
        "list_url": "https://www.daejeonbus.or.kr/sub0501.do",
        # 목록 HTML에서 (글번호, 제목)을 뽑는 정규식. 검증: 10건 정상 파싱.
        "list_pattern": r'boardSeq=(\d+)[^>]*>\s*([^<]{5,60})',
        # 글번호를 끼워 본문 페이지 URL 만드는 틀
        "view_url": "https://www.daejeonbus.or.kr/sub0501view.do?boardSeq={id}",
        "note": "교통 공지 밀도 최고(시간표 변경·운행차질·우회). robots 제약 없음. 인코딩 UTF-8.",
    },
    {
        "id": "daejeon_city",
        "name": "대전광역시 공지",
        "active": True,                     # 2026-07-27 검증 완료 (목록·본문·필터)
        "list_url": "https://www.daejeon.go.kr/drh/board/boardNormalList.do"
                    "?boardId=normal_0189&menuSeq=6825",
        "list_pattern": r'ntatcSeq=(\d+)[^>]*>\s*([^<]{5,60})',
        "view_url": "https://www.daejeon.go.kr/drh/board/boardNormalView.do"
                    "?boardId=normal_0189&menuSeq=6825&ntatcSeq={id}",
        "body_selector": ".board_view",
        # 시정 소식이 대부분 — 교통 관련 제목만 통과시킨다
        "title_filter": r"우회|통제|노선|버스|시간표|운행|교통|도로|정류장|BRT",
        "note": "robots.txt Disallow:/ — 인지하고 학습용 저빈도(하루 1회·5건)로 진행. "
                "시정 보도자료 위주라 title_filter 필수 (교통 공지 밀도 낮음, 0건인 날 많음).",
    },
    {
        "id": "gbis_route",
        "name": "경기버스정보(GBIS) 노선신설·폐선안내",
        "active": True,                     # 2026-07-27 검증 완료 (JSON 목록·script 본문·GET 원문링크)
        # 표준 HTML 파싱이 안 되는 소스 — scout의 전용 페처 사용 (목록=JSON POST, 본문=script 변수)
        "fetcher": "gbis_route_change",
        "list_url": "https://www.gbis.go.kr/gbis2014/publicService.action",
        "list_pattern": None,               # fetcher가 대신함
        "view_url": "https://www.gbis.go.kr/gbis2014/publicService.action"
                    "?cmd=getRouteChangeView&noticeIdx={id}&rnNum=1",
        "note": "경기 전역(성남·분당 포함) 노선 신설·폐선. 데모데이(네이버1784) 관할 소스. "
                "게시판 자체가 노선 공지 전용이라 title_filter 불필요. "
                "참고: 성남시청은 봇 차단(가짜 404), GBIS 데스크톱 목록은 JS 렌더 → JSON API 직접 호출로 우회.",
    },
    {
        "id": "sejong_sctc",
        "name": "세종도시교통공사 공지사항",
        "active": True,                     # 2026-07-27 검증 완료 (목록·본문)
        "list_url": "https://www.sctc.kr/bbs/BBSS1612021757537630",
        # 글 식별자가 쿼리가 아니라 URL 경로(BBSW…) — 버스조합과 패턴 구조가 다름
        "list_pattern": r'/bbs/view/BBSS1612021757537630/([A-Z0-9]+)[^>]*>\s*([^<]{5,60})',
        "view_url": "https://www.sctc.kr/bbs/view/BBSS1612021757537630/{id}/",
        "body_selector": ".bbs-body-view",
        # "교통"은 기관명(세종도시교통공사)에 걸려 오탐 → 세종 키워드에서 제외
        "title_filter": r"우회|통제|노선|버스|시간표|운행|도로|정류장|BRT",
        "note": "정적 HTML. 노선 공지 실림 확인(예: 1004번 운행 변경). 공모전·안내글 섞여 title_filter 적용. "
                "BIS(bis.sejong)는 JS라 제외.",
    },
]
