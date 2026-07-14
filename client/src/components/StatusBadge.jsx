import { bakeryStatus, statusMeta } from '../utils/bakeryStatus.js';

// 추가기능 스펙 1번: 마감임박/한산해요 표시. tag="status-bubble"(지도 핀 위) | "status-chip"(카드/제목 옆)
export default function StatusBadge({ bakery, tag }) {
  const meta = statusMeta(bakeryStatus(bakery));
  if (!meta) return null;
  return <span className={`${tag} ${meta.cls}`}>{meta.label}</span>;
}
