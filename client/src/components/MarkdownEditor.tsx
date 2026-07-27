interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: Props) {
  return (
    <textarea
      className="code-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus
    />
  );
}
