const TARGET_OPTIONS = ["지역 주민", "직장인", "학생", "주부", "1인 가구", "여행객/방문객", "고령층"];

function TargetChips({ value, onToggle }) {
  return (
    <div className="flex flex-wrap gap-sm">
      {TARGET_OPTIONS.map((option) => {
        const active = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`px-md py-xs rounded-full border font-label-md text-label-md transition-all ${
              active
                ? "bg-primary-container border-primary-container text-on-primary"
                : "bg-white border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default TargetChips;
