import "./Badge.css";

const LABELS = {
  pass: "통과",
  masked: "마스킹",
  blocked: "차단",
};

export default function Badge({ status, children }) {
  return (
    <span className={`badge badge--${status}`}>
      {children ?? LABELS[status] ?? status}
    </span>
  );
}
