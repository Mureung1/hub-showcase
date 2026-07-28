import { useState } from "react";
import { fetchRecommendations } from "../recommendClient";
import Card from "./Card";

// 자연어로 원하는 걸 쓰면 LLM이 '지원 가능한 것' 중에서 의도(경쟁률·스펙·전공무관 등)에 맞는 걸 골라준다.
// 돌려받는 건 공고 id + 추천 이유뿐이라, 화면이 이미 가진 공고에 붙여 카드로 보여준다.
export default function RecommendBox({ postings, favorites, onToggleFav, onOpen }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { profile, candidateCount, results:[{id,reason}] }

  const byId = new Map(postings.map((p) => [p.id, p]));

  const submit = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await fetchRecommendations(prompt));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 돌려받은 id를 화면 공고에 매칭하고 이유를 단다. 못 찾은 id는 건너뛴다.
  const cards = (result?.results || [])
    .map((r) => ({ item: byId.get(r.id), reason: r.reason }))
    .filter((x) => x.item);

  return (
    <section className="ai-box">
      <div className="ai-head">
        <h3>AI에게 물어보기</h3>
        <p>원하는 걸 문장으로 적어줘. 지원 가능한 것 중에 딱 맞는 걸 골라줄게.</p>
      </div>
      <textarea
        className="ai-input"
        rows={3}
        placeholder="예: 부산 사는 3학년인데, 경쟁률 높고 스펙에 도움될 전공 무관 대외활동 추천해줘"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
      />
      <div className="ai-actions">
        <button className="ai-btn" onClick={submit} disabled={loading || !prompt.trim()}>
          {loading ? "고르는 중…" : "추천받기"}
        </button>
      </div>

      {error && <p className="ai-error">추천을 못 받았어요: {error}</p>}
      {result && !loading && (
        <div className="ai-results">
          <p className="ai-summary">지원 가능한 {result.candidateCount}건 중에서 골랐어요.</p>
          {cards.length === 0 ? (
            <p className="empty">딱 맞는 걸 못 찾았어요. 문장을 바꿔서 다시 물어볼래?</p>
          ) : (
            <div className="cards">
              {cards.map(({ item, reason }) => (
                <div key={item.id} className="ai-card">
                  <div className="ai-reason">{reason}</div>
                  <Card item={item} fav={favorites.has(item.id)} onToggleFav={() => onToggleFav(item.id)} onOpen={() => onOpen(item)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
