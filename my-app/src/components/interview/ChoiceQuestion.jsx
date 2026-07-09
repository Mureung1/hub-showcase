function ChoiceCard({ option, selected, onSelect }) {
  const cardClass = selected
    ? "selection-card group relative p-lg border-2 border-primary bg-on-primary-container/10 rounded-xl text-left transition-all duration-200 active:scale-[0.98]"
    : "selection-card group relative p-lg border border-outline-variant rounded-xl text-left transition-all duration-200 hover:border-primary/50 active:scale-[0.98]";
  const iconBoxClass = selected
    ? "w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center transition-colors"
    : "w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-primary-fixed transition-colors";
  const iconClass = selected
    ? "material-symbols-outlined text-white"
    : "material-symbols-outlined text-on-surface-variant group-hover:text-primary";
  const outerCircleClass = selected
    ? "w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center transition-colors"
    : "w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center group-hover:border-primary transition-colors";
  const dotClass = selected
    ? "w-2.5 h-2.5 rounded-full bg-primary opacity-100"
    : "w-2.5 h-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100";

  return (
    <button type="button" onClick={() => onSelect(option.value)} className={cardClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md">
          <div className={iconBoxClass}>
            <span className={iconClass}>{option.icon}</span>
          </div>
          <div>
            <p className="font-headline-sm text-[18px] text-on-surface">{option.label}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {option.description}
            </p>
          </div>
        </div>
        <div className={outerCircleClass}>
          <div className={dotClass} />
        </div>
      </div>
    </button>
  );
}

function ChoiceQuestion({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-md">
      {options.map((option) => (
        <ChoiceCard
          key={option.value}
          option={option}
          selected={value === option.value}
          onSelect={onChange}
        />
      ))}
    </div>
  );
}

export default ChoiceQuestion;
