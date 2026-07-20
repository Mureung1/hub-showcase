import { useState, useEffect } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import { CATEGORIES, DEFAULT_PROFILE } from "./constants";
import { loadPostings } from "./data/loadPostings";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import DetailPage from "./pages/DetailPage";
import FavoritesPage from "./pages/FavoritesPage";
import "./App.css";

// App은 여러 화면이 공유하는 state를 갖고, 각 페이지에는 Outlet context(props)로 내려준다.
// state = 여기서 바뀌는 값(내 소유), props = 페이지가 받아서 읽고 쓰는 통로.
export default function App() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);      // 입력 중(draft)
  const [showScholarship, setShowScholarship] = useState(false);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState({ profile: DEFAULT_PROFILE, showScholarship: false, query: "" }); // "찾기" 누른 시점
  const [cats, setCats] = useState(() => new Set(CATEGORIES));
  const [favOnly, setFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState("deadline");
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("favorites") || "[]")); } catch { return new Set(); }
  });

  // 공고 데이터. 마운트될 때 한 번 불러온다(Supabase 있으면 DB, 없으면 mock).
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    loadPostings()
      .then(setPostings)
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, []);

  const setField = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  const runSearch = () => setApplied({ profile, showScholarship, query });
  // 상세화면에서 조건을 바로 고칠 때: draft와 applied를 함께 바꿔 즉시(전역) 재매칭되게 한다.
  const applyField = (key, value) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setApplied((a) => ({ ...a, profile: { ...a.profile, [key]: value } }));
  };
  const toggleFav = (id) => setFavorites((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleCat = (c) => setCats((prev) => {
    const next = new Set(prev);
    next.has(c) ? next.delete(c) : next.add(c);
    return next;
  });

  // 적용된 조건으로 만든 매칭용 프로필(장학 토글 꺼지면 소득·학점 제외). 여러 화면이 이걸로 판정한다.
  const ap = applied.profile;
  const matchProfile = {
    ...ap,
    income: applied.showScholarship ? ap.income : null,
    gpa: applied.showScholarship ? ap.gpa : null,
  };

  // 페이지에 내려줄 통로(props). 각 페이지는 useOutletContext()로 꺼내 쓴다.
  const ctx = {
    profile, setField, applyField, showScholarship, setShowScholarship, query, setQuery, runSearch, applied,
    matchProfile, cats, toggleCat, favOnly, setFavOnly, sortBy, setSortBy, favorites, toggleFav,
    postings, loading, loadError,
  };

  return (
    <div className="app">
      <NavBar favCount={favorites.size} />
      <Routes>
        <Route element={<Outlet context={ctx} />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/activity/:id" element={<DetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Route>
      </Routes>
    </div>
  );
}
