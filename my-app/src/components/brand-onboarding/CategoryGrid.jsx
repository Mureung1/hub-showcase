import { CATEGORIES } from "./categories";

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
