import { useEffect, useMemo, useState } from "react";
import { portfolioApi } from "./portfolioApi.js";
import PortfolioFilters from "./PortfolioFilters.jsx";
import {
  ALL_THEMES,
  filterPortfolios,
  getPortfolioThemeOptions,
} from "./portfolioFilters.js";
import "./portfolioLibrary.css";

const formatDate = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function errorMessage(error) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

export default function PortfolioLibrary({
  html,
  cv,
  theme,
  onOpen,
  api = portfolioApi,
}) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("idle");
  const [favoriteActions, setFavoriteActions] = useState({});
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [themeSlug, setThemeSlug] = useState(ALL_THEMES);

  const themes = useMemo(() => getPortfolioThemeOptions(portfolios), [portfolios]);
  const visiblePortfolios = useMemo(
    () => filterPortfolios(portfolios, { query, themeSlug }),
    [portfolios, query, themeSlug],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .list()
      .then((rows) => alive && setPortfolios(rows))
      .catch((error) => alive && setMessage(errorMessage(error)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [api]);

  async function save() {
    setAction("saving");
    setMessage("");
    try {
      const saved = await api.save({
        name: cv.name || "이름 없음",
        title: cv.title || "",
        themeSlug: theme.slug,
        themeName: theme.name,
        html,
      });
      setPortfolios((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setMessage(`“${saved.name}” 포트폴리오를 저장했습니다.`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setAction("idle");
    }
  }

  async function open(id) {
    setAction(id);
    setMessage("");
    try {
      const portfolio = await api.get(id);
      onOpen(portfolio);
      setMessage(`“${portfolio.name}” 포트폴리오를 불러왔습니다.`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setAction("idle");
    }
  }

  async function toggleFavorite(portfolio) {
    setFavoriteActions((current) => ({ ...current, [portfolio.id]: true }));
    setMessage("");
    try {
      const updated = await api.updateFavorite(portfolio.id, !portfolio.isFavorite);
      setPortfolios((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setMessage(
        updated.isFavorite
          ? `${updated.name} 포트폴리오를 즐겨찾기에 추가했습니다.`
          : `${updated.name} 포트폴리오의 즐겨찾기를 해제했습니다.`,
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setFavoriteActions((current) => {
        const next = { ...current };
        delete next[portfolio.id];
        return next;
      });
    }
  }

  return (
    <section className="portfolio-library" aria-labelledby="portfolio-library-title">
      <div className="library-heading">
        <div>
          <p className="library-eyebrow">Supabase 저장소</p>
          <h2 id="portfolio-library-title">최근 포트폴리오</h2>
          <p>현재 결과를 저장하고, 이전 결과를 다시 미리볼 수 있습니다.</p>
        </div>
        <button className="btn success" onClick={save} disabled={action !== "idle"}>
          {action === "saving" ? "저장 중…" : "현재 결과 저장"}
        </button>
      </div>

      <div className="library-status" role="status" aria-live="polite">
        {message || (loading ? "저장된 포트폴리오를 불러오는 중…" : "")}
      </div>

      {!loading && portfolios.length > 0 && (
        <PortfolioFilters
          query={query}
          themeSlug={themeSlug}
          themes={themes}
          totalCount={portfolios.length}
          resultCount={visiblePortfolios.length}
          onQueryChange={setQuery}
          onThemeChange={setThemeSlug}
          onReset={() => {
            setQuery("");
            setThemeSlug(ALL_THEMES);
          }}
        />
      )}

      {!loading && portfolios.length === 0 ? (
        <p className="library-empty">아직 저장된 포트폴리오가 없습니다.</p>
      ) : !loading && visiblePortfolios.length === 0 ? (
        <p className="library-empty">
          조건에 맞는 기록이 없습니다. 검색어나 디자인 필터를 바꿔보세요.
        </p>
      ) : (
        <ul className="portfolio-list">
          {visiblePortfolios.map((portfolio) => (
            <li key={portfolio.id}>
              <div>
                <strong>{portfolio.name}</strong>
                <span>{portfolio.title || "직함 없음"}</span>
              </div>
              <div className="portfolio-meta">
                <span>{portfolio.themeName}</span>
                <time dateTime={portfolio.createdAt}>
                  {formatDate.format(new Date(portfolio.createdAt))}
                </time>
                <button
                  className={`btn favorite-button ${portfolio.isFavorite ? "on" : ""}`}
                  type="button"
                  aria-pressed={portfolio.isFavorite}
                  onClick={() => toggleFavorite(portfolio)}
                  disabled={Boolean(favoriteActions[portfolio.id])}
                >
                  {favoriteActions[portfolio.id]
                    ? "변경 중…"
                    : portfolio.isFavorite
                      ? "★ 즐겨찾기 해제"
                      : "☆ 즐겨찾기"}
                </button>
                <button
                  className="btn"
                  onClick={() => open(portfolio.id)}
                  disabled={action !== "idle"}
                >
                  {action === portfolio.id ? "불러오는 중…" : "불러오기"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
