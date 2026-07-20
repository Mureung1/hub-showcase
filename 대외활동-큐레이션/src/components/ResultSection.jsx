import { useState } from "react";
import Card from "./Card";

const PAGE_SIZE = 10;

// 결과 한 섹션(가능/확인 필요/거의 가능). 비어 있으면 안 그린다.
// 한 번에 PAGE_SIZE개만 보여주고, "더보기"를 누르면 더 펼친다(실데이터가 많아 무한 스크롤 방지).
export default function ResultSection({ title, items, cls, favorites, onToggleFav, onOpen }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  if (!items.length) return null;
  const shown = items.slice(0, visible);
  const rest = items.length - shown.length;

  return (
    <div className={"section " + cls}>
      <h3 className="section-title">{title}<span className="count">{items.length}</span></h3>
      <div className="cards">
        {shown.map((it) => (
          <Card key={it.id} item={it} fav={favorites.has(it.id)} onToggleFav={() => onToggleFav(it.id)} onOpen={() => onOpen(it)} />
        ))}
      </div>
      {rest > 0 && (
        <button className="fold" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          더보기 ({rest}건 더)
        </button>
      )}
    </div>
  );
}
