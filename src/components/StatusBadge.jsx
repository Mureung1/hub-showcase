import { ddayLabel } from "../status";

/**
 * 유통기한 상태 배지 (시그니처 요소).
 * 신호등 색 + "신선/임박/만료" 텍스트를 함께 표기해 색 외로도 상태를 전달한다.
 */
export default function StatusBadge({ status, dday }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="dot" aria-hidden="true" />
      <span>{status}</span>
      {dday !== undefined && <span className="dday">· {ddayLabel(dday)}</span>}
    </span>
  );
}
