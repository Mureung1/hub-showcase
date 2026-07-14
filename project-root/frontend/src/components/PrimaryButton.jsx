// components/PrimaryButton.jsx
import "./PrimaryButton.css";

export default function PrimaryButton({ children, onClick, disabled = false, type = "button" }) {
  return (
    <button
      type={type}
      className="primary-btn"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}