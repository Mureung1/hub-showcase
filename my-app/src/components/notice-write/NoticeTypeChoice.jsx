function TypeCard({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={`group flex flex-col items-start p-lg border-2 rounded-xl text-left transition-all active:scale-[0.98] ${
        selected
          ? "border-primary bg-on-primary-container/10"
          : "border-outline-variant hover:border-primary/50 hover:bg-surface-container-low"
      }`}
    >
      <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center text-2xl mb-sm group-hover:scale-110 transition-transform">
        {option.emoji}
      </div>
      <span className="font-body-lg text-body-lg font-bold text-on-surface">
        {option.label}
      </span>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
        {option.description}
      </p>
    </button>
  );
}

function NoticeTypeChoice({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
      {options.map((option) => (
        <TypeCard
          key={option.value}
          option={option}
          selected={value === option.value}
          onSelect={onChange}
        />
      ))}
    </div>
  );
}

export default NoticeTypeChoice;
