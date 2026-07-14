import { differenceInCalendarDays, parseISO } from 'date-fns';

type DdayBadgeProps = {
  deadline: string;
  baseDate: string;
};

export default function DdayBadge({ deadline, baseDate }: DdayBadgeProps) {
  const days = differenceInCalendarDays(parseISO(deadline), parseISO(baseDate));
  const isUrgent = days <= 2;

  return (
    <span className={`d-day-badge ${isUrgent ? 'd-day-badge--urgent' : 'd-day-badge--normal'}`}>
      D-{days}
    </span>
  );
}
