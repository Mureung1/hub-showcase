const links = [["/", "홈"], ["/group-buys", "공동구매"], ["/activity", "내 활동"]];

function Header({ activePath, onLogout, onNavigate, user }) {
  return <header className="site-header"><div className="header-inner"><a className="brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}><span className="brand-mark">C</span><span><strong>Campus</strong>Cart</span></a><nav aria-label="주요 메뉴">{links.map(([path, label]) => <a className={activePath === path ? "active" : ""} href={path} key={path} onClick={(event) => { event.preventDefault(); onNavigate(path); }}>{label}</a>)}</nav>{user ? <div className="header-user"><span>{user.nickname}</span><button type="button" onClick={onLogout}>로그아웃</button></div> : <button className="header-cta" type="button" onClick={() => onNavigate("/login")}>로그인</button>}</div></header>;
}

export default Header;
