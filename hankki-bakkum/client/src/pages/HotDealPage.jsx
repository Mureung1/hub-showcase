import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./HotDealPage.css";

// 기획서 8절 — Tab1 고정 태그 4종 (임의 추가 금지)
const TAGS = ["마감할인", "노쇼발생", "우천특가", "당일한정"];

/**
 * ① 핫딜 피드 — 사장님이 올린 돌발 이벤트(마감할인·노쇼·우천특가) 게시판
 *  - 태그 4종 필터 칩
 *  - 썸네일은 Tab2 완료 결과물 이미지가 재사용된 것 (선순환 구조)
 */
export default function HotDealPage() {
  const [deals, setDeals] = useState([]);
  const [owners, setOwners] = useState({}); // { userId: nickname }
  const [activeTag, setActiveTag] = useState(null); // null = 전체
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDeals() {
      const { data } = await supabase
        .from("hot_deals")
        .select("*")
        .order("created_at", { ascending: false });

      const list = data ?? [];
      setDeals(list);

      // 글쓴이(사장님) 닉네임을 한 번에 조회해 map으로 보관
      const ownerIds = [...new Set(list.map((d) => d.owner_id))];
      if (ownerIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, nickname")
          .in("id", ownerIds);
        const map = {};
        (users ?? []).forEach((u) => { map[u.id] = u.nickname; });
        setOwners(map);
      }
      setLoading(false);
    }
    loadDeals();
  }, []);

  // 태그 필터 — 선택 안 했으면 전체
  const visible = activeTag ? deals.filter((d) => d.tag === activeTag) : deals;

  return (
    <section className="hotdeal">
      <h1 className="sec-title">동네 핫딜 🔥</h1>
      <p className="hotdeal-cap">지금 이 순간 우리 동네 소식이에요</p>

      {/* 태그 필터 칩 */}
      <div className="hotdeal-tags">
        <button
          className={`chip ${activeTag === null ? "chip--on" : ""}`}
          onClick={() => setActiveTag(null)}
        >
          전체
        </button>
        {TAGS.map((t) => (
          <button
            key={t}
            className={`chip ${activeTag === t ? "chip--on" : ""}`}
            onClick={() => setActiveTag(t)}
          >
            #{t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="hotdeal-empty">불러오는 중이에요…</p>
      ) : visible.length === 0 ? (
        <p className="hotdeal-empty">
          {activeTag ? `#${activeTag} 소식이 아직 없어요.` : "아직 올라온 핫딜이 없어요."}
        </p>
      ) : (
        <div className="hotdeal-list">
          {visible.map((d) => (
            <article key={d.id} className="deal-card">
              {/* 썸네일 = Tab2 완료 결과물 재사용 (선순환) */}
              {d.thumbnail_url && (
                <div className="deal-thumb-wrap">
                  <img className="deal-thumb" src={d.thumbnail_url} alt="" />
                  <span className="deal-badge">🤝 헬퍼 작품</span>
                </div>
              )}
              <div className="deal-body">
                <span className="chip chip--hot">#{d.tag}</span>
                <p className="deal-content">{d.content}</p>
                <p className="deal-meta">
                  {owners[d.owner_id] ?? "사장님"} · {d.region}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}