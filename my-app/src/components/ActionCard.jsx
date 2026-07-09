import Card from "./Card";

const VARIANTS = {
  primary: {
    iconBg: "bg-primary-fixed",
    iconColor: "text-primary",
    border: "border-primary",
    text: "text-primary",
    hoverBg: "hover:bg-primary-fixed/20",
  },
  secondary: {
    iconBg: "bg-secondary-container",
    iconColor: "text-secondary",
    border: "border-secondary",
    text: "text-secondary",
    hoverBg: "hover:bg-secondary-container/20",
  },
};

function ActionCard({ variant, icon, title, description, actionLabel, onAction }) {
  const style = VARIANTS[variant];

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div
          className={`w-12 h-12 ${style.iconBg} rounded-xl flex items-center justify-center ${style.iconColor} mb-md`}
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm mb-xs">{title}</h3>
        <p className="text-body-sm text-on-surface-variant mb-xl">{description}</p>
      </div>
      <button
        onClick={onAction}
        className={`w-full py-md border ${style.border} ${style.text} font-bold rounded-lg ${style.hoverBg} transition-colors`}
      >
        {actionLabel}
      </button>
    </Card>
  );
}

export default ActionCard;
