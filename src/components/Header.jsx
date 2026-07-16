const links = [["/", "홈"], ["/group-buys", "공동구매"], ["/activity", "내 활동"], ["/pickup", "수령 장소"]];

function Header({ activePath, onNavigate }) {
  return <header className="site-header"><div className="header-inner"><a className="brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}><span className="brand-mark">C</span><span><strong>Campus</strong>Cart</span></a><nav aria-label="주요 메뉴">{links.map(([path, label]) => <a className={activePath === path ? "active" : ""} href={path} key={path} onClick={(event) => { event.preventDefault(); onNavigate(path); }}>{label}</a>)}</nav><button className="header-cta" type="button" onClick={() => onNavigate("/group-buys")}>＋ 모집 열기</button></div></header>;
}

export default Header;
