import { getDaysUntil, formatDday } from "../utils/daysUntil";
import { getDdayTone } from "../utils/ddayTone";

// D-day 를 급한 정도에 따라 색이 다른 칩으로 보여준다.
// 숫자만 보고 급한지 판단하게 하면, 과목이 여러 개일 때 한눈에 비교가 안 된다.
function DdayChip({ examDate }) {
  const daysUntil = getDaysUntil(examDate);
  const tone = getDdayTone(daysUntil);

  if (tone === "none") {
    return null;
  }

  return (
    <span className={`dday-chip is-${tone}`}>
      {formatDday(daysUntil)}
      {tone === "past" && <span className="sr-only"> 시험이 지났어요</span>}
    </span>
  );
}

export default DdayChip;
