function DateQuestion({ value, onChange }) {
  return (
    <div className="flex items-center gap-md py-lg">
      <span className="material-symbols-outlined text-primary">calendar_month</span>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="px-md py-md border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}

export default DateQuestion;
