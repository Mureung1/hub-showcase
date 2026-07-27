interface Props {
  content: string;
}

// Read-only preview — pairs with MarkdownEditor for the toggle pattern used
// wherever a Step's document can be reviewed and edited (analysis report now,
// workspace Step documents later).
export default function MarkdownViewer({ content }: Props) {
  return <pre className="code">{content}</pre>;
}
