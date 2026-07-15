type LessonCardProps = {
  title: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  classNameActive?: string;
  classNameCard?: string;
};

export default function LessonCard({
  title,
  label,
  isActive,
  onClick,
  classNameActive,
  classNameCard,
}: LessonCardProps) {
  return (
    <button
      type="button"
      className={`${classNameCard || ""} ${isActive ? classNameActive || "" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{title}</strong>
    </button>
  );
}
