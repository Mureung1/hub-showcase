export const localTwinIntro = {
  name: "LocalTwin",
  eyebrow: "Public Data Commerce Analytics + 3D Digital Twin",
  summary:
    "공공데이터 기반 상권 분석 대시보드를 기본 기능으로 구현하고, 추가 기술 기능으로 한 가게 앞 10~20m 공간의 3D 장면 탐색과 시간대별 관찰 데이터를 연결하는 웹 프로토타입입니다.",
  problem:
    "소상공인과 예비창업자는 업종 밀도, 생활인구, 개폐업 흐름 같은 데이터를 따로 찾아야 하고, 실제 거리의 공간감과 시간대별 분위기는 함께 비교하기 어렵습니다.",
  solution:
    "LocalTwin은 공공데이터 기반 분석을 먼저 제공하고, 3D 장면 탐색과 시간대별 관찰 기능은 입지 판단을 더 생생하게 보여주는 부가기능으로 확장합니다.",
  tags: ["기본 상권 분석", "공공데이터", "부가기능 3D 탐색", "입지 리포트"],
  pillars: [
    {
      title: "상권 지도 대시보드",
      description:
        "특정 상권 1곳을 기준으로 점포 분포, 동일 업종 경쟁 강도, 개업/폐업 흐름, 생활인구 변화를 한 화면에서 비교하는 기본 기능입니다.",
      meta: "Core Feature",
    },
    {
      title: "입지 점수와 AI 해석",
      description:
        "수요, 경쟁, 변화 데이터를 설명 가능한 규칙 기반 점수로 합산하고, 분석 결과를 리포트 문장으로 해석하는 기본 의사결정 기능입니다.",
      meta: "Core Feature",
    },
    {
      title: "3D 장면 탐색과 시간대 관찰",
      description:
        "한 가게 앞 또는 거리 10~20m를 복원한 장면에서 마커와 시간대별 혼잡도 정보를 확인하는 추가 기술 기능입니다.",
      meta: "Optional Tech",
    },
  ],
  flow: [
    "지역 선택",
    "공공데이터 분석",
    "경쟁/수요 확인",
    "입지 점수 계산",
    "입지 리포트",
  ],
  scope: [
    { label: "대상 지역", value: "특정 상권 1곳" },
    { label: "대상 업종", value: "카페 또는 음식점 1개부터" },
    { label: "촬영 범위", value: "가게 앞 10~20m" },
    { label: "관찰 시간", value: "10시 / 13시 / 15시 / 18시" },
  ],
  metrics: [
    { label: "입지 점수", value: "73", suffix: "/100", tone: "primary" },
    { label: "동일 업종", value: "18", suffix: "곳", tone: "amber" },
    { label: "주요 반경", value: "500", suffix: "m", tone: "green" },
  ],
  observation: [
    { time: "10:00", crowd: "낮음", count: 21 },
    { time: "13:00", crowd: "보통", count: 46 },
    { time: "15:00", crowd: "높음", count: 68 },
    { time: "18:00", crowd: "보통", count: 52 },
  ],
  previews: [
    {
      title: "대표 컨셉 화면",
      description:
        "기본 상권 분석에 3D 장면과 시간대별 유동 인구를 확장 기능으로 더했을 때의 목표 화면입니다.",
      src: "/localtwin-concept-preview.png",
    },
    {
      title: "3D 장면 탐색 상세 예시",
      description:
        "분석 레이어, 시간대별 유동 인구, 지도 조작 UI를 포함한 부가기능 화면 예시입니다.",
      src: "/3d-scene-preview.png",
    },
  ],
};
