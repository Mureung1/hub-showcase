// variant: "primary" | "ghost"

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
}) {
  const className = variant === "ghost" ? "btn btn--ghost" : "btn";

  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
