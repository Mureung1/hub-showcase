// components/TimeTableCard.jsx
import "./TimeTableCard.css";
import Badge from "./Badge";

export default function TimeTableCard({ title, totalCredit, targetCredit, children }) {
  const isExact = totalCredit === targetCredit;

  return (
    <div className="tt-card">
      <div className="tt-card__header">
        <span className="tt-card__title">{title}</span>
        <div className="tt-card__badges">
          <Badge variant={isExact ? "success" : "default"}>
            {totalCredit}학점{isExact ? " · 목표 일치" : ` · 목표 ${targetCredit}학점`}
          </Badge>
        </div>
      </div>
      <div className="tt-card__body">{children}</div>
    </div>
  );
}
