function NoticeContentQuestion({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={6}
      className="w-full px-md py-md border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface leading-relaxed focus:outline-none focus:border-primary transition-colors resize-none"
    />
  );
}

export default NoticeContentQuestion;
