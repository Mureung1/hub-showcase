// 상단바 — 브랜드 + 직군/정렬 필터 + 갱신/신규/마감 뱃지 + 다크/라이트 토글
const selLabel = { fontSize: 11.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }
const selectStyle = { background: 'var(--card-hi)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 14px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }
const badge = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 11px', borderRadius: 100, border: '1px solid var(--border)', background: 'var(--card-hi)', whiteSpace: 'nowrap' }
const btnBase = { padding: '6px 12px', border: 'none', borderRadius: 10, fontSize: 11.5, cursor: 'pointer' }
const active = { fontWeight: 700, background: 'var(--card)', color: 'var(--text)' }
const inactive = { fontWeight: 500, background: 'transparent', color: 'var(--text-faint)' }

export default function Header({ theme, setTheme }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '18px 22px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, position: 'sticky', top: 12, zIndex: 20, boxShadow: '0 2px 12px rgba(25,31,40,0.06)', animation: 'fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--blue-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: 'var(--brand-fg)', flexShrink: 0 }}>CC</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>커리어 코파일럿</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 1 }}>내 위키·GitHub 기반 · 매일 자동 갱신되는 채용 공고 적합도 트래커</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, flexWrap: 'wrap' }}>
          <label style={selLabel}>직군</label>
          <select style={selectStyle}><option>전체</option><option>백엔드</option><option>AI 백엔드</option><option>AI 엔지니어</option></select>
          <label style={selLabel}>정렬</label>
          <select style={selectStyle}><option>가까운순 (갭 작은 순)</option><option>적합도 높은순</option><option>마감임박순</option><option>신규순</option></select>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>마지막 갱신 06:00</span>
        <span style={badge}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue-bright)' }} />어제 대비 신규 <b style={{ color: 'var(--text)' }}>+3</b></span>
        <span style={badge}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue-med)' }} />마감 임박 <b style={{ color: 'var(--text)' }}>2</b></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--card-hi)', border: '1px solid var(--border)', borderRadius: 12, padding: 3 }}>
          <button onClick={() => setTheme('dark')} style={{ ...btnBase, ...(theme === 'dark' ? active : inactive) }}>다크</button>
          <button onClick={() => setTheme('light')} style={{ ...btnBase, ...(theme === 'light' ? active : inactive) }}>라이트</button>
        </div>
      </div>
    </header>
  )
}
