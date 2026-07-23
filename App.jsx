import { useEffect,useState } from "react";
import "./styles/theme.css";
import "./styles/App.css";
import stocks from "./data/kospiStocks.json";
import NewsSection from "./components/NewsSection";
import AIAnalysis from "./components/AIAnalysis";


function App() {
  const [stockPrice, setStockPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [selectedStock, setSelectedStock] = useState(stocks[0]);

  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeLoading, setExchangeLoading] = useState(true);
  const [exchangeError, setExchangeError] = useState("");
  const [news, setNews] = useState([]);

  const [financialData, setFinancialData] = useState([]);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialError, setFinancialError] = useState("");
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
useEffect(() => {
  let isMounted = true;

  async function fetchNews() {
    try {
      const response = await fetch(
        `http://localhost:3001/api/news?query=${encodeURIComponent(
          selectedStock.name
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "뉴스 조회 실패");
      }

      if (isMounted) {
        setNews(data.news || []);
      }
    } catch (error) {
      console.error("뉴스 조회 오류:", error);

      if (isMounted) {
        setNews([]);
      }
    }
  }

  fetchNews();

  return () => {
    isMounted = false;
  };
}, [selectedStock]);

useEffect(() => {
  let isMounted = true;

  async function fetchFinancialData() {
    try {
      setFinancialLoading(true);
      setFinancialError("");

      const response = await fetch(
        `http://localhost:3001/api/financials?stockCode=${selectedStock.code}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "재무데이터 조회에 실패했습니다."
        );
      }

      const sourceData = Array.isArray(data)
        ? data
        : Array.isArray(data.financials)
          ? data.financials
          : [];

      const convertedData = sourceData.map((item) => ({
        ...item,
        year: String(item.year ?? ""),
        sales: Number(
          String(item.sales ?? 0).replaceAll(",", "")
        ) || 0,
        operatingProfit: Number(
          String(item.operatingProfit ?? 0).replaceAll(",", "")
        ) || 0,
        netIncome: Number(
          String(item.netIncome ?? 0).replaceAll(",", "")
        ) || 0,
        assets: Number(
          String(item.assets ?? 0).replaceAll(",", "")
        ) || 0,
        liabilities: Number(
          String(item.liabilities ?? 0).replaceAll(",", "")
        ) || 0,
        equity: Number(
          String(item.equity ?? 0).replaceAll(",", "")
        ) || 0,
      }));

      if (isMounted) {
        setFinancialData(convertedData);
      }
    } catch (error) {
      console.error("재무데이터 조회 오류:", error);

      if (isMounted) {
        setFinancialError(error.message);
        setFinancialData([]);
      }
    } finally {
      if (isMounted) {
        setFinancialLoading(false);
      }
    }
  }

  fetchFinancialData();

  return () => {
    isMounted = false;
  };
}, [selectedStock.code]);
const [selectedFinancialYear, setSelectedFinancialYear] =
  useState("2026");

const selectedFinancialData =
  financialData.find(
    (item) =>
      String(item.year).replace(/[^0-9]/g, "").slice(0, 4) ===
      selectedFinancialYear
  ) ??
  financialData[financialData.length - 1] ??
  null;

const formatTrillion = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue / 1_000_000_000_000;
};

const chartItems = selectedFinancialData
  ? [
      {
        label: "매출",
        value: formatTrillion(selectedFinancialData.sales),
      },
      {
        label: "영업이익",
        value: formatTrillion(
          selectedFinancialData.operatingProfit
        ),
      },
      {
        label: "순이익",
        value: formatTrillion(
          selectedFinancialData.netIncome
        ),
      },
      {
        label: "자산",
        value: formatTrillion(selectedFinancialData.assets),
      },
      {
        label: "부채",
        value: formatTrillion(
          selectedFinancialData.liabilities
        ),
      },
      {
        label: "자본",
        value: formatTrillion(selectedFinancialData.equity),
      },
    ]
  : [];

const maximumChartValue = Math.max(
  ...chartItems.map((item) => item.value ?? 0),
  1
);

const financialYears = financialData
  .map((item) =>
    String(item.year).replace(/[^0-9]/g, "").slice(0, 4)
  )
  .filter(
    (year, index, array) =>
      year && array.indexOf(year) === index
  )
  .sort((a, b) => Number(b) - Number(a));
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
          <article>
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
      
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="card chart-card">
            <div className="card-title-row">
             
          
            
            </div>

      <div className="financial-chart-header">
  <h2>재무추이 차트</h2>

  <select
    value={selectedFinancialYear}
    onChange={(event) =>
      setSelectedFinancialYear(event.target.value)
    }
    className="financial-year-select"
  >
    {financialYears.map((year) => (
      <option key={year} value={year}>
        {year}년
      </option>
    ))}
  </select>
</div>

{financialLoading ? (
  <div className="finance-chart chart-state">
    재무데이터를 불러오는 중입니다.
  </div>
) : financialError ? (
  <div className="finance-chart chart-state chart-error">
    {financialError}
  </div>
) : chartItems.length === 0 ? (
  <div className="finance-chart chart-state">
    표시할 재무데이터가 없습니다.
  </div>
) : (
  <div className="finance-chart">
    {chartItems.map((item) => {
      const height =
        item.value === null
          ? 0
          : Math.max(
              (Math.abs(item.value) / maximumChartValue) * 100,
              4
            );

      return (
        <div className="chart-column" key={item.label}>
          <div className="chart-value">
            {item.value === null
              ? "-"
              : `${item.value.toLocaleString("ko-KR", {
                  maximumFractionDigits: 1,
                })}조`}
          </div>

          <div className="chart-bar-wrap">
            <div
              className="chart-bar"
              style={{
                height: `${Math.min(height, 100)}%`,
              }}
            />
          </div>

          <div className="chart-label">{item.label}</div>
        </div>
      );
    })}
  </div>
)}
          </article>

          <article className="card">
            <h2>AI 분석</h2>
               <AIAnalysis
  selectedStock={selectedStock}
  stockPrice={stockPrice}
  financialData={null}
  news={news}

/>
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
              <div className="news-card">
  <NewsSection  news={news}
  selectedStock={selectedStock} />
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;