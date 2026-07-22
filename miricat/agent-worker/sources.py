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
        "name": "대전광역시 교통·시정 공지",
        "active": False,                    # 확인 필요 → 목요일 확장 때 검증 후 켜기
        "list_url": "https://www.daejeon.go.kr/drh/board/boardNormalList.do"
                    "?boardId=normal_0189&menuSeq=6825",
        "list_pattern": None,               # 확인 필요: 목록 셀렉터
        "view_url": "https://www.daejeon.go.kr/drh/board/boardNormalView.do"
                    "?boardId=normal_0189&menuSeq=6825&ntatcSeq={id}",
        "note": "robots.txt Disallow:/ — 인지하고 학습용 저빈도로 진행. "
                "교통 전용 아니라 시정 소식 섞임 → 교통 키워드(우회/통제/노선/버스) 필터 필요.",
    },
    {
        "id": "sejong_sctc",
        "name": "세종도시교통공사 공지사항",
        "active": False,                    # 확인 필요 → 목요일 확장 때
        "list_url": "https://www.sctc.kr/bbs/BBSS1612021757537630",
        "list_pattern": None,               # 확인 필요: 글 식별자가 쿼리가 아니라 URL 경로(BBSW...)
        "view_url": "https://www.sctc.kr/bbs/view/BBSS1612021757537630/{id}/",
        "note": "정적 HTML. 확인 필요: 이 보드에 노선 변경/우회 공고가 실제로 실리는지 "
                "(정찰 시 일반 안내글 위주였음). BIS(bis.sejong)는 JS라 제외.",
    },
]
