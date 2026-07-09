import { useApp } from '../context/AppContext';

const LEVEL_BADGE = { beginner: 'green', mid: 'amber', high: 'red' };

export default function RecipeDetail() {
  const { back, recipeDetail, checkedAddonIds, toggleAddon, cookSteps, startCooking, openCookDone } = useApp();
  if (!recipeDetail) return null;
  const r = recipeDetail;
  const have = r.ingredients.filter((ing) => ing.have).length;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>레시피 상세</h1></div>
      <div className="content">
        <div className="detail-hero">{r.emoji}</div>
        <h2 style={{ fontSize: 22 }}>
          {r.name} <span className={`badge ${LEVEL_BADGE[r.level] || 'green'}`}>{r.levelLabel}</span>
        </h2>
        <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 6 }}>⏱ {r.time}분 · 1인분{r.note ? ` · ${r.note}` : ''}</p>

        <div className="section-title">필요 재료 ({have}/{r.ingredients.length} 보유)</div>
        <div className="card" style={{ padding: '6px 16px' }}>
          {r.ingredients.map((ing, i) => (
            <div key={i} className={`ing-row${ing.have ? '' : ' miss'}`} style={i === r.ingredients.length - 1 ? { borderBottom: 'none' } : undefined}>
              <span className="ck">{ing.have ? '✅' : '❌'}</span>
              <span className="nm">{ing.name}{(!ing.id && !ing.untracked) && <> <span className="badge gray">선택</span></>}</span>
              <span className="amt">{ing.amt}</span>
            </div>
          ))}
        </div>

        {!!r.addons.length && (
          <>
            <div className="section-title">더 넣으면 좋아요 — 냉장고에 있어요 🧊</div>
            <div className="card" style={{ padding: '6px 16px' }}>
              {r.addons.map((a, i) => {
                const f = a.fridgeInfo;
                return (
                  <label key={a.id} className="addon-row" style={i === r.addons.length - 1 ? { borderBottom: 'none' } : undefined}>
                    <input type="checkbox" checked={checkedAddonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                    <span className="a-emoji">{f.emoji}</span>
                    <span className="a-info">
                      <b>{a.label}{f.imminent && <> <span className="badge red">{f.expiry}</span></>}</b>
                      <small>{a.desc}</small>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="notice" style={{ marginTop: -2 }}>체크하면 아래 조리 순서와 조리모드에 해당 재료 넣는 단계가 추가돼요</div>
          </>
        )}

        <div className="section-title">조리 순서 요약</div>
        <div className="card">
          <p style={{ fontSize: 14, lineHeight: 1.8 }}>
            {cookSteps.map((s, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {s.add ? <b style={{ color: 'var(--green-dark)' }}>{i + 1}. {s.sum} ＋</b> : `${i + 1}. ${s.sum}`}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="bottom-fixed">
        <div className="btn-row">
          <button className="btn ghost" onClick={startCooking}>👨‍🍳 조리모드 시작</button>
          <button className="btn primary" onClick={openCookDone}>🍽️ 요리 완료</button>
        </div>
      </div>
    </section>
  );
}
