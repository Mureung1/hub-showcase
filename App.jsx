import { useEffect,useState } from "react";
import "./styles/theme.css";
import "./styles/App.css";
import stocks from "./data/kospiStocks.json";

function App() {
  const [stockPrice, setStockPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [selectedStock, setSelectedStock] = useState(stocks[0]);

  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeLoading, setExchangeLoading] = useState(true);
  const [exchangeError, setExchangeError] = useState("");

  const filteredStocks = stocks.filter((stock) => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return (
      stock.name.toLowerCase().includes(normalizedKeyword) ||
      stock.code.includes(normalizedKeyword)
    );
  });

  const selectStock = (stock) => {
    setSelectedStock(stock);
    setKeyword("");
  };

  const handleSearch = () => {
    if (filteredStocks.length > 0) {
      selectStock(filteredStocks[0]);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };
useEffect(() => {
  let isMounted = true;

  async function fetchStockPrice() {
    try {
      setPriceLoading(true);
      setPriceError("");

      const response = await fetch(
        `http://localhost:3001/api/stocks/${selectedStock.code}/price`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "현재가 조회에 실패했습니다.");
      }

      if (isMounted) {
        setStockPrice(data);
      }
    } catch (error) {
      if (isMounted) {
        setPriceError(error.message);
      }
    } finally {
      if (isMounted) {
        setPriceLoading(false);
      }
    }
  }

  fetchStockPrice();

  // 5초마다 현재가 갱신
  const intervalId = setInterval(fetchStockPrice, 5000);

  return () => {
    isMounted = false;
    clearInterval(intervalId);
  };
}, [selectedStock.code]);

useEffect(() => {
  let isMounted = true;

  async function fetchExchangeRate() {
    try {
      setExchangeLoading(true);
      setExchangeError("");

      const response = await fetch(
        "http://localhost:3001/api/exchange-rate"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "환율 조회에 실패했습니다."
        );
      }

      if (isMounted) {
        setExchangeRate(data);
      }
    } catch (error) {
      if (isMounted) {
        setExchangeError(error.message);
      }
    } finally {
      if (isMounted) {
        setExchangeLoading(false);
      }
    }
  }

  fetchExchangeRate();

  // 1시간마다 환율 다시 조회
  const intervalId = setInterval(
    fetchExchangeRate,
    60 * 60 * 1000
  );

  return () => {
    isMounted = false;
    clearInterval(intervalId);
  };
}, []);
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">AI 투자분석</div>

        <nav className="nav-menu">
          <button className="nav-item active">대시보드</button>
          <button className="nav-item">관심 종목</button>
          <button className="nav-item">기업 정보</button>
          <button className="nav-item">설정</button>
        </nav>

        <div className="sidebar-help">
          <strong>도움이 필요하신가요?</strong>
          <p>AI 분석 설정을 확인해보세요.</p>
          <button>가이드 보기</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div>
            <p className="eyebrow">KRX: {selectedStock.code}</p>
            <h1>{selectedStock.name}</h1>
          </div>

          <div className="search-box">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="종목명 또는 종목코드 검색"
              aria-label="종목 검색"
            />
            <button type="button" onClick={handleSearch}>
              검색
            </button>

            {keyword.trim() && (
              <div className="search-result">
                {filteredStocks.length > 0 ? (
                  filteredStocks.map((stock) => (
                    <button
                      type="button"
                      key={stock.code}
                      className="search-item"
                      onClick={() => {setSelectedStock(stock);
                                     setStockPrice(null);
                                     setPriceError("");
                                     setKeyword("");}}
                    >
                      <span>{stock.name}</span>
                      <span className="search-code">{stock.code}</span>
                    </button>
                  ))
                ) : (
                  <div className="search-empty">검색 결과가 없습니다.</div>
                )}
              </div>
            )}
          </div>
        </header>

        <section className="summary-grid">
          <article className="card stat-card">
            <article className="card stat-card">
  <span>현재가</span>

  {priceLoading && !stockPrice ? (
    <strong className="price-loading">불러오는 중...</strong>
  ) : priceError ? (
    <strong className="price-error">조회 실패</strong>
  ) : stockPrice ? (
    <>
      <strong>{stockPrice.price.toLocaleString()}원</strong>

      <em
        className={
          stockPrice.changeRate > 0
            ? "up"
            : stockPrice.changeRate < 0
              ? "down"
              : ""
        }
      >
        {stockPrice.changeRate > 0 ? "+" : ""}
        {stockPrice.changeRate.toFixed(2)}%
      </em>
    </>
  ) : (
    <strong>-</strong>
  )}
</article>
          </article>

          <article className="card stat-card">
            <span>금(원/g)</span>
            <strong>197,810</strong>
            <em className="down">-0.55%</em>
          </article>

          <article className="card stat-card">
  <span>USD/KRW 환율</span>

  {exchangeLoading && !exchangeRate ? (
    <strong>불러오는 중...</strong>
  ) : exchangeError ? (
    <>
      <strong className="price-error">조회 실패</strong>
      <em className="down">{exchangeError}</em>
    </>
  ) : exchangeRate ? (
    <>
      <strong>
        {exchangeRate.baseRate.toLocaleString("ko-KR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        원
      </strong>

      <em
        className={
          exchangeRate.changeRate > 0
            ? "up"
            : exchangeRate.changeRate < 0
              ? "down"
              : ""
        }
      >
        {exchangeRate.changeRate > 0 ? "+" : ""}
        {exchangeRate.changeRate.toFixed(2)}%
      </em>
    </>
  ) : (
    <strong>-</strong>
  )}
</article>

          <article className="card stat-card">
            <span>투자의견</span>
            <strong>BUY</strong>
            <em className="up">목표가 320,000원</em>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="card chart-card">
            <div className="card-title-row">
              <h2>재무추이 차트</h2>
              <select defaultValue="2026-4Q">
                <option>2026-4Q</option>
                <option>2026-3Q</option>
                <option>2026-2Q</option>
                <option>2026-1Q</option>
                <option>2025-4Q</option>
                <option>2025-3Q</option>
                <option>2025-2Q</option>
                <option>2025-1Q</option>
                <option>2024-4Q</option>
                <option>2024-3Q</option>
                <option>2024-2Q</option>
                <option>2024-1Q</option>
                <option>2023-4Q</option>
                <option>2023-3Q</option>
                <option>2023-2Q</option>
                <option>2023-1Q</option>
              </select>
            </div>

            <div className="finance-chart">
              {[
                { label: "매출", value: 302, height: "88%" },
                { label: "영업이익", value: 35, height: "48%" },
                { label: "순이익", value: 26, height: "38%" },
                { label: "자산", value: 455, height: "100%" },
                { label: "부채", value: 92, height: "58%" },
                { label: "자본", value: 363, height: "92%" },
              ].map((item) => (
                <div className="chart-column" key={item.label}>
                  <div className="chart-value">{item.value}조</div>
                  <div className="chart-bar-wrap">
                    <div className="chart-bar" style={{ height: item.height }} />
                  </div>
                  <div className="chart-label">{item.label}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <h2>AI 분석</h2>
            <p className="analysis-text">
              최근 실적 회복세와 반도체 업황 개선으로 중장기 성장 가능성이
              있습니다. 다만 단기 주가 변동성과 환율 리스크는 주의가 필요합니다.
            </p>
          </article>

          <article className="card">
            <h2>재무제표</h2>
            <ul className="metric-list">
              <li>
                <span>자산총계</span>
                <strong>455.9조</strong>
              </li>
              <li>
                <span>부채총계</span>
                <strong>92.2조</strong>
              </li>
              <li>
                <span>자본총계</span>
                <strong>363.7조</strong>
              </li>
            </ul>
          </article>

          <article className="card">
            <h2>최신 뉴스</h2>
            <div className="news-item">
              <strong>AI 반도체 수요 증가 전망</strong>
              <span>2시간 전</span>
            </div>
            <div className="news-item">
              <strong>메모리 업황 회복 기대감 확대</strong>
              <span>5시간 전</span>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;