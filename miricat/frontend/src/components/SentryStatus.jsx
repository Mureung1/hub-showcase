import { api } from "../lib/api";
import { useState, useEffect } from "react";

// 순찰 시각 표시: 오늘이면 "오늘 07:31", 아니면 "7.28 07:31"
function fmtPatrol(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? `오늘 ${hm}` : `${d.getMonth() + 1}.${d.getDate()} ${hm}`;
}

// 홈 상단 한 줄 — 보초가 살아서 돌고 있다는 증거 (마지막 순찰·게시판·보관 공지)
export default function SentryStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch(api("/api/status"))
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});   // 상태 조회 실패는 조용히 — 홈의 본기능과 무관
  }, []);

  if (!status?.lastPatrol) return null;

  return (
    <div className="sentry-status">
      🐾 보초 근무 중 · 마지막 순찰 <b>{fmtPatrol(status.lastPatrol)}</b> · 게시판 {status.sourceCount}곳 · 공지 {status.noticeCount}건 보관 중
    </div>
  );
}
