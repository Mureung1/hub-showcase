export const CATEGORIES = [
  { id: "cafe", icon: "local_cafe", label: "카페" },
  { id: "restaurant", icon: "restaurant", label: "음식점" },
  { id: "beauty", icon: "content_cut", label: "뷰티/미용" },
  { id: "retail", icon: "shopping_bag", label: "소매/유통" },
  { id: "fitness", icon: "fitness_center", label: "운동/건강" },
  { id: "education", icon: "school", label: "학원/교육" },
  { id: "medical", icon: "medical_services", label: "병원/의원" },
  { id: "etc", icon: "more_horiz", label: "기타" },
];

function CategoryGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
      {CATEGORIES.map((category) => {
        const active = value === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={`flex flex-col items-center justify-center gap-xs p-md border rounded-lg transition-all ${
              active
                ? "border-primary bg-on-primary-container text-primary"
                : "border-outline-variant bg-white text-on-surface-variant hover:border-primary"
            }`}
          >
            <span className="material-symbols-outlined text-4xl">{category.icon}</span>
            <span className="font-label-md">{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default CategoryGrid;
