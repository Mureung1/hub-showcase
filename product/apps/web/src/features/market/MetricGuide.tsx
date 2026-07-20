import type { CategorySelection } from "./types";

const guides = {
  카페: [
    ["시간대별 유동인구", "손님이 움직이는 시간", "영업시간과 인력 배치를 정할 때 봅니다."],
    ["동일 업종 점포", "주변 카페 경쟁 정도", "점포 수와 밀도를 함께 보고 과밀 여부를 판단합니다."],
    [
      "점포당 추정매출",
      "경쟁 점포 한 곳당 매출 수준",
      "점포 수가 많아도 수요가 충분한지 비교합니다.",
    ],
  ],
  음식점: [
    [
      "시간대별 유동인구",
      "점심·저녁 수요가 움직이는 시간",
      "주력 식사 시간과 영업시간을 맞출 때 봅니다.",
    ],
    [
      "점포당 추정매출",
      "음식점 한 곳당 매출 수준",
      "상권의 소비 규모가 경쟁을 감당하는지 확인합니다.",
    ],
    ["개·폐업 현황", "선택 분기의 진입과 이탈", "폐업 수와 순증을 함께 보고 변동성을 살핍니다."],
  ],
  베이커리: [
    ["상주·직장인구", "생활 수요와 평일 수요", "아침·간식 구매를 만들 배후 고객을 확인합니다."],
    ["점포당 추정매출", "베이커리 한 곳당 매출 수준", "수요와 점포 수의 균형을 비교합니다."],
    ["동일 업종 점포", "주변 베이커리 경쟁 정도", "가까운 경쟁 점포가 과도하게 몰렸는지 봅니다."],
  ],
  편의점: [
    [
      "상주·직장인구",
      "반복 구매를 만들 배후 고객",
      "주거형인지 직장형인지 상권 성격을 구분합니다.",
    ],
    ["시간대별 유동인구", "하루 중 통행 수요 변화", "심야·출퇴근 시간 운영 가능성을 봅니다."],
    ["동일 업종 점포", "근거리 편의점 경쟁 정도", "짧은 생활권 안의 점포 밀도를 확인합니다."],
  ],
} as const;

type MetricGuideProps = {
  selection: CategorySelection;
};

export function MetricGuide({ selection }: MetricGuideProps) {
  if (selection.coverage === "unavailable") {
    return (
      <section className="metric-guide" aria-label="업종 분석 안내">
        <b>{selection.name} 분석 안내</b>
        <p>현재 공식 분석 근거가 없어 다른 업종의 값을 대신 보여주지 않습니다.</p>
      </section>
    );
  }

  if (selection.coverage === "partial" || !selection.analysisCategory) {
    return (
      <section className="metric-guide" aria-label="업종 분석 안내">
        <b>{selection.name}에서 먼저 볼 지표</b>
        <p>현재는 실제 점포 위치와 반경 안의 동일 업종 점포 수만 확인할 수 있습니다.</p>
      </section>
    );
  }

  return (
    <section className="metric-guide" aria-label="업종 분석 안내">
      <b>{selection.name}에서 먼저 볼 지표</b>
      <ol>
        {guides[selection.analysisCategory].map(([metric, meaning, use]) => (
          <li key={metric}>
            <strong>{metric}</strong>
            <span>{meaning}</span>
            <small>{use}</small>
          </li>
        ))}
      </ol>
      <details>
        <summary>용어와 해석 방법</summary>
        <dl>
          <dt>추정매출</dt>
          <dd>서울시가 카드 소비 등을 바탕으로 추정한 상권 집계이며 개별 점포 매출은 아닙니다.</dd>
          <dt>유동인구</dt>
          <dd>길 단위에서 추정한 이동 인구로, 실제 방문객 수와 같다는 뜻은 아닙니다.</dd>
          <dt>순증</dt>
          <dd>선택 분기의 개업 수에서 폐업 수를 뺀 값이며 성공 가능성을 직접 뜻하지 않습니다.</dd>
        </dl>
      </details>
    </section>
  );
}
