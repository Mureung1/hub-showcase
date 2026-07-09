const PADDING = { none: "p-0", lg: "p-lg", xl: "p-xl" };

function Card({ padding = "lg", className = "", children }) {
  return (
    <div
      className={`bg-white rounded-xl ${PADDING[padding]} shadow-soft border border-outline-variant transition-all duration-200 hover:-translate-y-0.5 hover:shadow-dropdown ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
