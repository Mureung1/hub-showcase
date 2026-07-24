import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

type BriefingHeaderProps = {
  date: string;
  greeting: string;
  showCompleted: boolean;
  onToggleCompleted: () => void;
};

export default function BriefingHeader({
  date,
  greeting,
  showCompleted,
  onToggleCompleted,
}: BriefingHeaderProps) {
  const formatted = format(parseISO(date), 'M월 d일 (eee)', { locale: ko });

  return (
    <header className="briefing-header">
      <p className="briefing-header__date">{formatted}</p>
      <h1 className="briefing-header__greeting">{greeting}</h1>
      <div className="briefing-header__actions">
        <button className="briefing-header__completed-btn" onClick={onToggleCompleted}>
          {showCompleted ? '브리핑 Task로 이동' : '완료한 Task로 이동'}
        </button>
      </div>
    </header>
  );
}
