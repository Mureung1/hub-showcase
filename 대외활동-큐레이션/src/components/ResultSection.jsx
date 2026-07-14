import Card from "./Card";

// 결과 한 섹션(가능/확인 필요/거의 가능). 비어 있으면 안 그린다.
export default function ResultSection({ title, items, cls, favorites, onToggleFav, onOpen }) {
  if (!items.length) return null;
  return (
    <div className={"section " + cls}>
      <h3 className="section-title">{title}<span className="count">{items.length}</span></h3>
      <div className="cards">
        {items.map((it) => (
          <Card key={it.id} item={it} fav={favorites.has(it.id)} onToggleFav={() => onToggleFav(it.id)} onOpen={() => onOpen(it)} />
        ))}
      </div>
    </div>
  );
}
