// prototype/demo_13.html의 renderFooter()를 포팅하되, QUICK LINKS/SUPPORT 컬럼은 뺐다(사용자 요청) —
// 브랜드(로고+설명) 컬럼과 하단 저작권 줄만 유지.
function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-wordmark">
                <span className="logo-spec">Spec</span>
                <span className="logo-fit">
                  F<span className="logo-i">i<span className="logo-dot" /></span>t
                </span>
              </span>
            </div>
            <p className="footer-desc">
              JOB-ALIO 채용정보 데이터를 활용한 스펙 자가진단 서비스입니다. 내 스펙으로 지금 지원 가능한 공고를 빠르게 확인해보세요.
            </p>
          </div>
        </div>
        <div className="footer-bottom mono">© 2026 SpecFit.</div>
      </div>
    </footer>
  )
}

export default Footer
