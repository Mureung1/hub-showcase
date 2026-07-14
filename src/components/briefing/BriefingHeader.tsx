import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

type BriefingHeaderProps = {
  date: string;
  greeting: string;
};

export default function BriefingHeader({ date, greeting }: BriefingHeaderProps) {
  const formatted = format(parseISO(date), 'M월 d일 (eee)', { locale: ko });

  return (
    <header className="briefing-header">
      <p className="briefing-header__date">{formatted}</p>
      <h1 className="briefing-header__greeting">{greeting}</h1>
    </header>
  );
}
