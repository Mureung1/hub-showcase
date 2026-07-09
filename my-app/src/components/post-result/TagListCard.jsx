import Card from "../Card";

const VARIANTS = {
  seo: "px-sm py-1 rounded-full bg-secondary-container/20 text-on-secondary-container text-label-md font-label-md",
  hashtag: "px-sm py-1 rounded-full bg-surface-container-high text-on-surface-variant text-label-md font-label-md",
};

function TagListCard({ title, icon, variant, tags }) {
  const tagClass = VARIANTS[variant];

  return (
    <Card className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm">{title}</h3>
        {icon && <span className="material-symbols-outlined text-secondary">{icon}</span>}
      </div>
      <div className="flex flex-wrap gap-xs">
        {tags.map((tag) => (
          <span key={tag} className={tagClass}>
            #{tag}
          </span>
        ))}
      </div>
    </Card>
  );
}

export default TagListCard;
