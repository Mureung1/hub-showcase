import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Main() {
  const [status, setStatus] = useState("연결 확인 중...");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api
      .health()
      .then(() => setStatus("서버 연결됨"))
      .catch(() => setStatus("서버 연결 실패 — server가 켜져 있는지 확인하세요"));

    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <span className="logo">캠퍼스핏</span>
          <nav className="nav-links">
            <a>홈</a>
            <a>팀원모집</a>
          </nav>
        </div>
      </header>
      <main className="page">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <h1 style={{ margin: 0 }}>캠퍼스핏</h1>
          <span className="pill">{status}</span>
        </div>
        <p className="main-sub">직접 찾지 않아도, 조건에 맞는 것만 걸러서 보여드려요.</p>
        <div className="cat-grid">
          {categories.map((c) => (
            <div className="cat-card" key={c.id}>
              <span className="cat-card__title">{c.label}</span>
              <span className="cat-card__desc">{c.desc}</span>
            </div>
          ))}
          <div className="cat-card board">
            <span className="cat-card__title">🤝 팀원모집</span>
            <span className="cat-card__desc">함께할 팀원 구하고 지원하기</span>
          </div>
        </div>
      </main>
    </>
  );
}
