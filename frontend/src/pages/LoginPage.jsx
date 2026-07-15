import React, { useState } from "react";

function LoginDialog({ onClose }) {
  return (
    <div className="login-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dialog-close" onClick={onClose} aria-label="로그인 창 닫기">
          <X size={20} />
        </button>
        <h2 id="login-title">로그인</h2>
        <p>인증 기능을 연결하면 이곳에서 내 레시피북을 열 수 있어요.</p>
        <button className="dialog-confirm" onClick={onClose}>확인</button>
      </section>
    </div>
  )
}

const LoginPage = () => {
  return (
    <main className="login-page">
      <div className="cover-scene">
        <picture className="cover-asset" aria-hidden="true">
          <source media="(max-width: 767px)" srcSet={mobileCover} />
          <img src={desktopCover} alt="" />
        </picture>
        <button className="cover-login" onClick={() => setLoginOpen(true)}>
          <span>로그인</span>
        </button>
      </div>

      <section className="welcome-copy" aria-labelledby="welcome-title">
        <p className="brand-name">나만의 레시피북</p>
        <h1 id="welcome-title">맛과 기억을<br />한 권에 담아요.</h1>
        <p>흩어진 레시피를 모으고, 누구에게 배웠는지와 함께 오래 남겨보세요.</p>
      </section>

      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} />}
    </main>
  )
}

export default LoginPage;