import { useEffect, useMemo, useState } from "react";
import "./styles/theme.css";
import "./styles/App.css";
import NewsSection from "./components/NewsSection";
import AIAnalysis from "./components/AIAnalysis";
import { getFinancialStatements } from "./services/financialService";
import FinancialSyncButton from "./components/FinancialSyncButton";
import { supabase } from "./lib/supabase";

const DEFAULT_STOCK = {
  name: "삼성전자",
  code: "005930",
  corpCode: "00126380",
  market: "KOSPI",
};

function App() {
  const [keyword, setKeyword] = useState("");
  const [selectedStock, setSelectedStock] = useState(DEFAULT_STOCK);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [stockPrice, setStockPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");

  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeLoading, setExchangeLoading] = useState(true);
  const [exchangeError, setExchangeError] = useState("");

  const [news, setNews] = useState([]);
  const [financialData, setFinancialData] = useState([]);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialError, setFinancialError] = useState("");
  const [selectedFinancialYear, setSelectedFinancialYear] = useState("");
  const searchCompanies = async (searchKeyword) => {
    const trimmedKeyword = searchKeyword.trim();

    if (!trimmedKeyword) {
      setSearchResults([]);
      setSearchError("");
      return [];
    }

    const safeKeyword = trimmedKeyword
      .replace(/[%_,()]/g, "")
      .trim();

    if (!safeKeyword) {
      setSearchResults([]);
      setSearchError("");
      return [];
    }

    try {
      setIsSearching(true);
      setSearchError("");

      const { data, error } = await supabase
        .from("companies")
        .select(
          "id, company_name, stock_code, corp_code, market",
        )
        .in("market", ["KOSPI", "KOSDAQ"])
        .or(
          `company_name.ilike.%${safeKeyword}%,stock_code.ilike.%${safeKeyword}%`,
        )
        .order("company_name", { ascending: true })
        .limit(20);

      if (error) {
        throw error;
      }

      const results = data ?? [];
      setSearchResults(results);
      return results;
    } catch (error) {
      console.error("종목 검색 오류:", error);
      setSearchResults([]);
      setSearchError("기업 목록을 불러오지 못했습니다.");
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      setSearchResults([]);
      setSearchError("");
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      searchCompanies(trimmedKeyword);
    }, 300);

    return () => window.clearTimeout(timerId);
  }, [keyword]);

  const selectStock = (company) => {
    const selectedStockData = {
      name: company.company_name,
      code: String(company.stock_code).padStart(6, "0"),
      corpCode: company.corp_code ?? "",
      market: company.market,
    };

    setSelectedStock(selectedStockData);
    setKeyword("");
    setSearchResults([]);
    setSearchError("");
    setStockPrice(null);
    setPriceError("");
  };

  const handleSearch = () => {
    searchCompanies(keyword);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
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
          `http://localhost:3001/api/stocks/${selectedStock.code}/price`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "현재가 조회에 실패했습니다.",
          );
        }

        if (isMounted) {
          setStockPrice(data);
        }
      } catch (error) {
        if (isMounted) {
          setPriceError(
            error instanceof Error
              ? error.message
              : "현재가 조회에 실패했습니다.",
          );
        }
      } finally {
        if (isMounted) {
          setPriceLoading(false);
        }
      }
    }

    fetchStockPrice();

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
          "http://localhost:3001/api/exchange-rate",
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "환율 조회에 실패했습니다.",
          );
        }

        if (isMounted) {
          setExchangeRate(data);
        }
      } catch (error) {
        if (isMounted) {
          setExchangeError(
            error instanceof Error
              ? error.message
              : "환율 조회에 실패했습니다.",
          );
        }
      } finally {
        if (isMounted) {
          setExchangeLoading(false);
        }
      }
    }

    fetchExchangeRate();

    const intervalId = setInterval(
      fetchExchangeRate,
      60 * 60 * 1000,
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
            selectedStock.name,
          )}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "뉴스 조회에 실패했습니다.");
        }

        if (isMounted) {
          setNews(Array.isArray(data.news) ? data.news : []);
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
  }, [selectedStock.name]);

  useEffect(() => {
    let isMounted = true;

    async function fetchFinancialStatements() {
      try {
        setFinancialLoading(true);
        setFinancialError("");

        const stockCode = String(selectedStock.code)
          .trim()
          .padStart(6, "0");

        const result = await getFinancialStatements(
          stockCode,
          2015,
          2026,
        );

        if (!isMounted) {
          return;
        }

        const convertedData = Array.isArray(result)
          ? result.map((item) => ({
              ...item,
              year: String(item.year ?? ""),
              sales: Number(item.revenue ?? item.sales ?? 0),
              operatingProfit: Number(
                item.operating_profit ??
                  item.operatingProfit ??
                  0,
              ),
              netIncome: Number(
                item.net_income ?? item.netIncome ?? 0,
              ),
              assets: Number(item.assets ?? 0),
              liabilities: Number(item.liabilities ?? 0),
              equity: Number(item.equity ?? 0),
            }))
          : [];

        setFinancialData(convertedData);

        if (convertedData.length === 0) {
          setFinancialError(
            `${selectedStock.name}의 저장된 재무제표 데이터가 없습니다.`,
          );
        }
      } catch (error) {
        console.error("Supabase 재무제표 조회 오류:", error);

        if (isMounted) {
          setFinancialData([]);
          setFinancialError(
            error instanceof Error
              ? error.message
              : "재무제표를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (isMounted) {
          setFinancialLoading(false);
        }
      }
    }

    fetchFinancialStatements();

    return () => {
      isMounted = false;
    };
  }, [selectedStock.code, selectedStock.name]);

  const financialYears = useMemo(() => {
    return financialData
      .map((item) =>
        String(item.year).replace(/[^0-9]/g, "").slice(0, 4),
      )
      .filter(
        (year, index, array) =>
          year && array.indexOf(year) === index,
      )
      .sort((a, b) => Number(b) - Number(a));
  }, [financialData]);

  useEffect(() => {
    if (financialYears.length === 0) {
      setSelectedFinancialYear("");
      return;
    }

    if (!financialYears.includes(selectedFinancialYear)) {
      setSelectedFinancialYear(financialYears[0]);
    }
  }, [financialYears, selectedFinancialYear]);

  const selectedFinancialData = useMemo(() => {
    return (
      financialData.find((item) => {
        const itemYear = String(item.year)
          .replace(/[^0-9]/g, "")
          .slice(0, 4);

        return itemYear === selectedFinancialYear;
      }) ??
      financialData[financialData.length - 1] ??
      null
    );
  }, [financialData, selectedFinancialYear]);

  const formatTrillion = (value) => {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      return null;
    }

    return numberValue / 1_000_000_000_000;
  };

  const formatFinancialAmount = (value) => {
    const trillionValue = formatTrillion(value);

    if (trillionValue === null) {
      return "-";
    }

    return `${trillionValue.toLocaleString("ko-KR", {
      maximumFractionDigits: 1,
    })}조`;
  };

  const chartItems = useMemo(() => {
    if (!selectedFinancialData) {
      return [];
    }

    return [
      {
        label: "매출",
        value: formatTrillion(selectedFinancialData.sales),
      },
      {
        label: "영업이익",
        value: formatTrillion(
          selectedFinancialData.operatingProfit,
        ),
      },
      {
        label: "순이익",
        value: formatTrillion(selectedFinancialData.netIncome),
      },
      {
        label: "자산",
        value: formatTrillion(selectedFinancialData.assets),
      },
      {
        label: "부채",
        value: formatTrillion(
          selectedFinancialData.liabilities,
        ),
      },
      {
        label: "자본",
        value: formatTrillion(selectedFinancialData.equity),
      },
    ];
  }, [selectedFinancialData]);

  const maximumChartValue = Math.max(
    ...chartItems.map((item) => Math.abs(item.value ?? 0)),
    1,
  );
const loadFinancialStatements = async () => {
  if (!selectedStock?.code) {
    setFinancialData([]);
    setFinancialError("");
    return;
  }

  try {
    setFinancialLoading(true);
    setFinancialError("");

    const result = await getFinancialStatements(
      selectedStock.code,
      2015,
      2026,
    );

    setFinancialData(result);
  } catch (error) {
    console.error("재무제표 조회 오류:", error);

    setFinancialData([]);
    setFinancialError(
      error instanceof Error
        ? error.message
        : "재무제표 조회에 실패했습니다.",
    );
  } finally {
    setFinancialLoading(false);
  }
};

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">AI 투자분석</div>

        <nav className="nav-menu">
          <button type="button" className="nav-item active">
            대시보드
          </button>
          <button type="button" className="nav-item">
            관심 종목
          </button>
          <button type="button" className="nav-item">
            기업 정보
          </button>
          <button type="button" className="nav-item">
            설정
          </button>
        </nav>

        <div className="sidebar-help">
          <strong>도움이 필요하신가요?</strong>
          <p>AI 분석 설정을 확인해보세요.</p>
          <button type="button">가이드 보기</button>
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
      {isSearching ? (
        <div className="search-empty">검색 중...</div>
      ) : searchError ? (
        <div className="search-empty search-error">
          {searchError}
        </div>
      ) : searchResults.length > 0 ? (
        searchResults.map((company) => (
          <button
            type="button"
            key={company.stock_code}
            className="search-item"
            onClick={() => selectStock(company)}
          >
            <span>{company.company_name}</span>
            <span className="search-code">
              {company.stock_code} · {company.market}
            </span>
          </button>
        ))
      ) : (
        <div className="search-empty">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  )}
</div>
        </header>

        <section className="summary-grid">
          <article className="card stat-card">
            <span>현재가</span>

            {priceLoading && !stockPrice ? (
              <strong className="price-loading">
                불러오는 중...
              </strong>
            ) : priceError ? (
              <strong className="price-error">조회 실패</strong>
            ) : stockPrice ? (
              <>
                <strong>
                  {Number(stockPrice.price).toLocaleString("ko-KR")}
                  원
                </strong>

                <em
                  className={
                    Number(stockPrice.changeRate) > 0
                      ? "up"
                      : Number(stockPrice.changeRate) < 0
                        ? "down"
                        : ""
                  }
                >
                  {Number(stockPrice.changeRate) > 0 ? "+" : ""}
                  {Number(stockPrice.changeRate).toFixed(2)}%
                </em>
              </>
            ) : (
              <strong>-</strong>
            )}
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
                  {Number(exchangeRate.baseRate).toLocaleString(
                    "ko-KR",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                  원
                </strong>

                <em
                  className={
                    Number(exchangeRate.changeRate) > 0
                      ? "up"
                      : Number(exchangeRate.changeRate) < 0
                        ? "down"
                        : ""
                  }
                >
                  {Number(exchangeRate.changeRate) > 0 ? "+" : ""}
                  {Number(exchangeRate.changeRate).toFixed(2)}%
                </em>
              </>
            ) : (
              <strong>-</strong>
            )}
          </article>
 

          <article className="card stat-card">
            <span></span>
</article>

 <article className="card stat-card">
            <span></span>
</article>
        </section>

        <section className="dashboard-grid">
          <article className="card chart-card">
          <div className="financial-chart-header">
              <h2>재무추이 차트</h2>
                <FinancialSyncButton
                selectedStock={selectedStock}
                  onSynced={loadFinancialStatements}
                      />
              <select
                value={selectedFinancialYear}
                onChange={(event) =>
                  setSelectedFinancialYear(event.target.value)
                }
                className="financial-year-select"
                disabled={financialYears.length === 0}
              >
                {financialYears.length === 0 ? (
                  <option value="">연도 없음</option>
                ) : (
                  financialYears.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))
                )}
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
                          (Math.abs(item.value) /
                            maximumChartValue) *
                            100,
                          4,
                        );

                  return (
                    <div
                      className="chart-column"
                      key={item.label}
                    >
                      <div className="chart-value">
                        {item.value === null
                          ? "-"
                          : `${item.value.toLocaleString(
                              "ko-KR",
                              {
                                maximumFractionDigits: 1,
                              },
                            )}조`}
                      </div>

                      <div className="chart-bar-wrap">
                        <div
                          className="chart-bar"
                          style={{
                            height: `${Math.min(height, 100)}%`,
                          }}
                        />
                      </div>

                      <div className="chart-label">
                        {item.label}
                      </div>
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
              financialData={financialData}
              news={news}
            />
          </article>

          <article className="card">
            <div className="card-title-row">
              <div>
                <h2>재무제표</h2>
                {selectedFinancialYear && (
                  <p>{selectedFinancialYear}년 기준</p>
                )}
              </div>
            </div>

            {financialLoading ? (
              <p>재무제표를 불러오는 중입니다.</p>
            ) : financialError ? (
              <p className="price-error">{financialError}</p>
            ) : selectedFinancialData ? (
              <ul className="metric-list">
                <li>
                  <span>매출액</span>
                  <strong>
                    {formatFinancialAmount(
                      selectedFinancialData.sales,
                    )}
                  </strong>
                </li>
                <li>
                  <span>영업이익</span>
                  <strong>
                    {formatFinancialAmount(
                      selectedFinancialData.operatingProfit,
                    )}
                  </strong>
                </li>
                <li>
                  <span>당기순이익</span>
                  <strong>
                    {formatFinancialAmount(
                      selectedFinancialData.netIncome,
                    )}
                  </strong>
                </li>
                <li>
                  <span>자산총계</span>
                  <strong>
                    {formatFinancialAmount(
                      selectedFinancialData.assets,
                    )}
                  </strong>
                </li>
                <li>
                  <span>부채총계</span>
                  <strong>
                    {formatFinancialAmount(
                      selectedFinancialData.liabilities,
                    )}
                  </strong>
                </li>
                <li>
                  <span>자본총계</span>
                  <strong>
                    {formatFinancialAmount(
                      selectedFinancialData.equity,
                    )}
                  </strong>
                </li>
              </ul>
            ) : (
              <p>표시할 재무제표가 없습니다.</p>
            )}
          </article>

          <article className="card">
            <h2>최신 뉴스</h2>

            <div className="news-card">
              <NewsSection
                news={news}
                selectedStock={selectedStock}
              />
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;