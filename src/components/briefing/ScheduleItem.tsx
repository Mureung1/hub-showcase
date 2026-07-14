type ScheduleItemProps = {
  time: string;
  title: string;
};

export default function ScheduleItem({ time, title }: ScheduleItemProps) {
  return (
    <div className="schedule-item">
      <span className="schedule-item__time">{time}</span>
      <span className="schedule-item__title">{title}</span>
    </div>
  );
}
