const replacements: Record<string, string> = {
  "서울 상권분석 공식 데이터를 불러오는 중입니다.":
    "Loading official Seoul commercial-district data.",
  "상권 분석 API에 연결하지 못했습니다. 예시 값으로 대체하지 않았습니다.":
    "The market-analysis API could not be reached. No sample values were substituted.",
  "오류를 점검해서 실제 분석 결과를 가져오지 못했습니다. 연결을 다시 확인해 주세요.":
    "The live analysis could not be loaded. Check the connection and try again.",
  "Demo mode · 검증 snapshot 예시이며 실제 조회 결과가 아닙니다.":
    "Demo mode · This is a verified snapshot, not a live query result.",
  "현재 근거 범위에서 비교 판단을 지원합니다.":
    "The available evidence supports a comparative review.",
  "누락 지표는 0점으로 단정하지 않고 component별 50점 중립값 방향으로 수축했습니다.":
    "Missing indicators are not treated as zero; they are shrunk toward a neutral score of 50 by component.",
  "서로 다른 상권 유형을 비교할 때는 점수보다 각 지표와 데이터 범위를 함께 확인하세요.":
    "When comparing different market types, review the indicators and data coverage alongside the score.",
  "서울시 공식 상권 경계를 기준으로 분석합니다.":
    "Analysis uses Seoul's official commercial-district boundary.",
  "지도 중심점과 선택 반경을 기준으로 실제 점포를 조회합니다.":
    "Nearby stores are queried from the map center and selected radius.",
  "선택 업종은 현재 상권 분석 지표를 모두 지원합니다.":
    "The selected category supports the full market-analysis indicator set.",
  "해당 세부 업종은 점포 위치와 반경 경쟁 지표만 제공합니다.":
    "This subcategory currently provides store locations and radius-based competition indicators only.",
  "선택 범위에서 해당 업종의 분석 근거를 확인할 수 없습니다.":
    "No analysis evidence is available for this category in the selected area.",
  "현재 적재된 완결 분기는 한 개입니다.": "One complete quarter is currently loaded.",
  "분석할 완결 분기를 선택합니다.": "Choose the completed quarter to analyze.",
  "분석 데이터 분기": "Analysis data quarter",
  "분석 조건 닫기": "Close analysis settings",
  "분석 결과 닫기": "Close analysis results",
  "데이터 산정 근거 닫기": "Close data evidence",
  "데이터 산정 근거": "Data evidence",
  "상권 또는 점포 검색": "Search a market or store",
  "상권 분석 작업 공간": "Market-analysis workspace",
  "상권 비교 닫기": "Close market comparison",
  "상권 비교": "Compare markets",
  "분석 조건": "Analysis settings",
  "데이터 기준": "Data sources",
  "상권 분석": "Market analysis",
  "상권 선택": "Market selection",
  업종: "Category",
  "상권 선택:": "Market:",
  "분석 범위": "Analysis scope",
  "분석 기준": "Analysis basis",
  "분석 반경": "Analysis radius",
  "분석 주제": "Analysis topic",
  "지도 표시": "Map layers",
  "분석 결과 열기": "Open analysis results",
  "분석 조건 열기": "Open analysis settings",
  "상권 비교 열기": "Open market comparison",
  "데이터 범위 보기": "View data coverage",
  "데이터 도움말": "Data help",
  "데모 데이터 안내": "Demo-data notice",
  "주요 메뉴": "Primary navigation",
  "상권 분석 홈": "Market analysis home",
  "상권명, 점포명, 주소, 업종 검색": "Search market, store, address, or category",
  "검색어를 입력해 주세요.": "Enter a search term.",
  "검색 중입니다.": "Searching.",
  "검색 결과가 없습니다.": "No search results.",
  "검색 결과": "Search results",
  "검색 API에 연결할 수 없습니다. 예시 데이터로 대체하지 않습니다.":
    "The search API could not be reached. No sample data was substituted.",
  초기화: "Reset",
  "어디를 비교할지 선택": "Choose what to compare",
  "무엇을 확인할지 선택": "Choose what to review",
  "지도 위에 보일 정보 선택": "Choose what appears on the map",
  "상권 경계": "Market boundary",
  "점포 위치": "Store locations",
  "업종 밀도": "Category density",
  "점포 밀도": "Store density",
  "시간대 수요": "Time-of-day demand",
  "인구 밀도": "Population density",
  "준비 중": "Coming soon",
  "전체 지원": "Full support",
  "전체 분석 지원": "Full analysis support",
  "부분 지원": "Partial support",
  "분석 미지원": "Analysis unavailable",
  상권: "Market area",
  "직접 선택": "Custom area",
  행정동: "Administrative district",
  종합: "Overview",
  "점포·개폐업": "Stores & turnover",
  "매출·소비": "Sales & spending",
  "경쟁 현황": "Competition",
  유동인구: "Foot traffic",
  "주거·직장인구": "Residents & workers",
  "주변 시설·접근성": "Amenities & access",
  "데이터 연결 예정": "Data connection planned",
  "DATA-011 연결 후 사용할 수 있습니다.": "Available after DATA-011 is connected.",
  "같은 조건에서 후보 상권을 비교합니다.":
    "Compare candidate market areas under the same conditions.",
  유동: "Foot traffic",
  순증: "Net change",
  "조회 전": "Not loaded",
  "데이터 기준 시점": "Data reference period",
  "이 화면의 숫자는 이렇게 읽습니다.": "How to read the numbers on this screen.",
  "현재 판정": "Current assessment",
  "분석 요약": "Analysis summary",
  신뢰도: "Confidence",
  "근거가 충분하지 않습니다.": "Evidence is insufficient.",
  "데이터 반영 범위": "Data coverage",
  "특수상권 판정": "Special-market classification",
  "긍정 근거": "Positive evidence",
  "주의 근거": "Caution evidence",
  "참고 근거": "Reference evidence",
  "데이터 한계": "Data limitations",
  "누락 지표를 0점으로 처리하지 않음": "Missing indicators are not treated as zero",
  "상권 변화": "Market turnover",
  "입지 점수": "Location score",
  "근거 보기": "View evidence",
  확인: "Done",
  "다시 시도": "Try again",
  "점포 선택 해제": "Clear store selection",
  "주변 점포": "Nearby stores",
  "주변 점포를 조회하고 있습니다.": "Loading nearby stores.",
  "주변 점포를 불러오지 못했습니다.": "Could not load nearby stores.",
  "선택 반경 안에 조회 가능한 점포가 없습니다.":
    "No queryable stores are available in the selected radius.",
  전체보기: "View all",
  "목록 접기": "Show less",
  "기본 지도는 계속 탐색할 수 있으며 새 분석은 지원 지역에서 시작합니다.":
    "You can keep exploring the base map. New analyses start inside a supported area.",
  "LocalTwin 분석 지원 범위 밖": "Outside LocalTwin analysis coverage",
  "이 위치에서 분석": "Analyze this location",
  "지도에서 위치 선택": "Choose a location on the map",
  "지도의 중심을 분석 위치로 사용합니다.": "Use the map center as the analysis location.",
  "연남·홍대·합정 지원 지역 안에서 분석 위치를 선택해 주세요.":
    "Choose an analysis location inside the Yeonnam, Hongdae, or Hapjeong coverage area.",
  "지원 범위를 불러오는 중입니다.": "Loading supported coverage.",
  "지원 범위를 불러오지 못했습니다.": "Could not load supported coverage.",
  "실제 지도는 브라우저 환경에서 표시됩니다.":
    "The live map is displayed in a browser environment.",
  "실제 지도": "Live map",
  검색: "Search",
  "현재 상권으로 이동": "Go to the current market area",
  "건물 레이어 표시": "Show building layer",
  확대: "Zoom in",
  축소: "Zoom out",
  "용어와 해석 방법": "Terms and interpretation",
  보고서: "Report",
  "보고서로 보기": "View report",
  카페: "Cafe",
  음식점: "Restaurant",
  베이커리: "Bakery",
  편의점: "Convenience store",
  연남: "Yeonnam",
  홍대: "Hongdae",
  합정: "Hapjeong",
  "연남동 골목상권": "Yeonnam-dong Neighborhood Market",
  "홍대입구역 상권": "Hongik Univ. Station Market",
  "합정역 상권": "Hapjeong Station Market",
  "연트럴파크(연남동주민센터)": "Yeontral Park (Yeonnam-dong Community Center)",
  "홍대입구역(홍대)": "Hongik Univ. Station (Hongdae)",
  합정역: "Hapjeong Station",
  "주의 필요": "Needs caution",
  "혼합 신호": "Mixed signals",
  낮음: "Low",
  보통: "Medium",
  높음: "High",
  "일반 상권": "General market",
  "특화상권 · 판단 보류": "Specialized market · decision deferred",
  "과포화 후보": "Possible saturation",
  "생산적 집적상권": "Productive cluster",
  "서울시 상권분석서비스": "Seoul Commercial Area Analysis Service",
  "서울시 길단위인구 집계": "Seoul street-level population data",
  "공식 분석 데이터를 불러오는 중입니다.": "Loading official analysis data.",
  "분석 데이터 확인 중": "Checking analysis data",
  미수집: "Not collected",
  "업종 미분류": "Unclassified category",
  "근거 없음": "No evidence",
  "분석 근거 없음": "No analysis evidence",
  "현재 공식 분석 근거가 없어 다른 업종의 값을 대신 보여주지 않습니다.":
    "No official analysis evidence is available, so values from other categories are not substituted.",
  "현재는 실제 점포 위치와 반경 안의 동일 업종 점포 수만 확인할 수 있습니다.":
    "This view currently shows real store locations and same-category store counts inside the selected radius.",
  "에서 먼저 볼 지표": " — key indicators to review",
  "손님이 움직이는 시간": "When customers are active",
  "영업시간과 인력 배치를 정할 때 봅니다.": "Use this when planning operating hours and staffing.",
  "주변 카페 경쟁 정도": "Nearby cafe competition",
  "점포 수와 밀도를 함께 보고 과밀 여부를 판단합니다.":
    "Review store count and density together to assess possible saturation.",
  "경쟁 점포 한 곳당 매출 수준": "Estimated sales per competing store",
  "점포 수가 많아도 수요가 충분한지 비교합니다.":
    "Compare whether demand remains sufficient despite the number of stores.",
  "선택 분기의 개업 수에서 폐업 수를 뺀 값이며 성공 가능성을 직접 뜻하지 않습니다.":
    "This is openings minus closures in the selected quarter. It does not directly indicate the likelihood of success.",
  "월별 변화가 아닌 선택 분기 합계입니다. 기간별 추이는 후속 분석에서 제공합니다.":
    "This is a selected-quarter total, not a monthly change. Period trends are planned for a future analysis.",
  "서울시 추정매출 집계이며 실제 개별 점포 매출이 아닙니다.":
    "This is a Seoul estimated-sales aggregate, not the actual sales of an individual store.",
  "API 순위 근거가 없습니다. 정적 fallback 값으로 순위를 만들지 않습니다.":
    "No API ranking evidence is available. Rankings are not created from static fallback values.",
  "현재 응답에서 확인 가능한 기간 근거가 없습니다.":
    "No period evidence is available in the current response.",
  "상권 분석 데이터를 불러오지 못했습니다.": "Could not load market-analysis data.",
  "개·폐업 집계 데이터를 불러오지 못했습니다.":
    "Could not load opening and closure aggregate data.",
  "서울시가 카드 소비 등을 바탕으로 추정한 상권 집계이며 개별 점포 매출은 아닙니다.":
    "This is a Seoul market aggregate estimated from card spending and other sources, not individual store sales.",
  "길 단위에서 추정한 이동 인구로, 실제 방문객 수와 같다는 뜻은 아닙니다.":
    "This is movement population estimated at street level; it is not the same as actual visitor count.",
  "6개 시간대 공식 집계를 0~100으로 정규화해 표시합니다. 개인 이동 정보가 아닙니다.":
    "Six official time-bucket aggregates are normalized to 0–100. This is not individual movement data.",
  "서울 peer 백분위의 수요·점포당 매출·폐업·업종 밀도·순증률만 반영합니다.":
    "The score uses Seoul peer percentiles for demand, sales per store, closures, category density, and net openings.",
  "동일 업종 점포": "Same-category stores",
  "동일 업종 밀도": "Same-category density",
  "동일 업종": "Same category",
  "선택 업종과 같은 점포만 집계합니다.": "Counts only stores in the selected category.",
  "점포당 추정매출": "Estimated sales per store",
  "개·폐업 현황": "Openings and closures",
  "상주·직장인구": "Residents and workers",
  "시간대별 유동인구": "Foot traffic by time of day",
  "시간대별 활동성": "Activity by time of day",
  "서울 길단위인구가 제공하는 6개 시간 구간입니다.":
    "Six time intervals from Seoul street-level population data.",
  "지표별 순위": "Metric rankings",
  "점수 산정 근거": "Score evidence",
  "점수의 근거와 읽는 법": "How to read this score",
  "상권 입지 점수": "Market location score",
  개업: "Openings",
  폐업: "Closures",
  "선택 분기의 업종별 집계": "Category aggregate for the selected quarter",
  추정매출: "Estimated sales",
  "분기 매출": "Quarterly sales",
  "분기 결제 건수": "Quarterly transactions",
  "지원 상권": "Supported markets",
  "같은 상권 유형": "Same market type",
  "높은 값 순 · 성공 순위 아님": "Highest value first · not a success ranking",
  "순위 근거가 없습니다.": "No ranking evidence is available.",
  "유동 인구": "Foot traffic",
  "유동 수요": "Foot-traffic demand",
  "점포 순증률": "Net store-growth rate",
  폐업률: "Closure rate",
  "상권 상주인구": "Market-area residents",
  "상권 직장인구": "Market-area workers",
  "상권·행정동 인구": "Market-area and administrative-district population",
  "공간 단위 분리": "Separate spatial units",
  "서울시 상권 경계": "Seoul market boundary",
  "서울시 상권분석서비스 길단위인구":
    "Seoul Commercial Area Analysis Service street-level population",
  "서울시 상권분석서비스 상주인구": "Seoul Commercial Area Analysis Service market-area residents",
  "서울시 상권분석서비스 직장인구": "Seoul Commercial Area Analysis Service market-area workers",
  "KOSIS 주민등록인구": "KOSIS resident registration population",
  "KOSIS 전국사업체조사": "KOSIS national business census",
  "행정동 배후통계": "Administrative-district background statistics",
  "행정동 주민": "Administrative-district residents",
  "행정동 종사자": "Administrative-district workers",
  사업체: "Businesses",
  "상권 경계와 행정동 경계는 다릅니다.":
    "Market-area and administrative-district boundaries differ.",
  "서울시 상권 polygon과 행정동 경계는 다르며 인구를 상권에 배분하지 않는다.":
    "Seoul market-area polygons and administrative-district boundaries differ; population is not allocated to market areas.",
  "과거 기준": "Historical reference",
  연남동: "Yeonnam-dong",
  서교동: "Seogyo-dong",
  합정동: "Hapjeong-dong",
  "조회 중": "Loading",
  "상주 밀도": "Resident density",
  "직장 밀도": "Worker density",
  상위: "Top",
  "지원하지 않습니다.": "is not supported.",
  "데이터 없음": "No data",
  "유동인구 상대값": "Relative foot-traffic value",
  "후보 보기": "View candidate",
  "동일 업종이 집중된 특화상권이지만 집적효과와 과포화를 구분할 근거가 충분하지 않아 가점·감점을 보류합니다.":
    "This category is concentrated, but the evidence is not strong enough to distinguish agglomeration benefits from saturation, so no adjustment is applied.",
  "동일 업종 집적이 peer group보다 뚜렷하게 높지 않습니다.":
    "Same-category concentration is not notably higher than the peer group.",
  "동일 업종 집적과 함께 점포당 매출 희석 또는 높은 폐업 신호가 나타나는 과포화 후보입니다.":
    "This is a possible saturation area, with category concentration alongside diluted sales per store or elevated closure signals.",
  "누락 지표는 50점 중립 방향으로 반영했습니다: 수요 증가율, 업종 다양성, 매출 증가율, 동일 cohort 생존율, 대중교통 접근성, 보행 접근성 근거 신뢰도가 낮아 점수보다 원자료와 누락 지표를 먼저 확인해야 합니다.":
    "Missing indicators are reflected toward a neutral score of 50. Because evidence confidence is low for demand growth, category diversity, sales growth, cohort survival, transit access, and walkability, review the raw data and missing indicators before relying on the score.",
  "서울시 상권분석서비스(점포-상권)_2025년":
    "Seoul Commercial Area Analysis Service (Stores by Market Area), 2025",
  "서울시 상권분석서비스 추정매출": "Seoul Commercial Area Analysis Service estimated sales",
};

const orderedReplacements = Object.entries(replacements).sort(
  ([left], [right]) => right.length - left.length,
);

export function translateEnglishText(value: string) {
  let translated = value;
  for (const [source, target] of orderedReplacements) {
    translated = translated.replaceAll(source, target);
  }
  return translated
    .replace(/(\d{4})년\s*(\d)분기 기준/g, "$1 Q$2")
    .replace(/(\d{4})년\s*(\d)분기/g, "$1 Q$2")
    .replace(/\b(\d{4})([1-4])\b/g, "$1 Q$2")
    .replace(/(\d{4})\.(\d)Q 기준/g, "$1 Q$2")
    .replace(/(\d+)개 동 중 (\d+)위/g, "#$2 of $1 districts")
    .replace(/(\d+)\/(\d+)위/g, "#$1 of $2")
    .replace(
      /(.+) peer 백분위가 (\d+)로 높아 긍정적입니다\./g,
      "$1 has a high peer percentile ($2), a positive signal.",
    )
    .replace(
      /(.+) peer 백분위가 (\d+)로 높아 주의가 필요합니다\./g,
      "$1 has a high peer percentile ($2), which warrants caution.",
    )
    .replace(
      /(.+) peer 백분위가 (\d+)로 낮아 주의가 필요합니다\./g,
      "$1 has a low peer percentile ($2), which warrants caution.",
    )
    .replace(/(\d{2})~(\d{2})시/g, "$1:00–$2:00")
    .replace(/(\d[\d,]*)원/g, "₩$1")
    .replace(/(\d[\d,]*)건/g, "$1 transactions")
    .replace(/(\d[\d,]*)명\/분기/g, "$1 people/quarter")
    .replace(/(\d[\d,]*)명\/km²/g, "$1 people/km²")
    .replace(/(\d[\d,]*)명/g, "$1 people")
    .replace(/(\d+)개 중 (\d+)개 표시/g, "Showing $2 of $1")
    .replace(/(\d+)개/g, "$1 items")
    .replace(/(\d+)위/g, "#$1");
}

export function translateEnglishAttribute(value: string) {
  return translateEnglishText(value);
}

export function translateEnglishTree(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent ?? "";
    const translated = translateEnglishText(value);
    if (translated !== value) node.textContent = translated;
    return;
  }
  if (!(node instanceof Element) || ["SCRIPT", "STYLE", "TEXTAREA"].includes(node.tagName)) return;
  node.childNodes.forEach(translateEnglishTree);
}
