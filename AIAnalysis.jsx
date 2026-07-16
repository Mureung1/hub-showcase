import { useState } from "react";
import "./AIAnalysis.css";

function AnalysisList({ title, items, type }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className={`ai-analysis-list ${type}`}>
      <h4>{title}</h4>

      <ul>
        {items.map((item, index) => (
          <li key={`${type}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function AIAnalysis({
  selectedStock,
  stockPrice,
  financialData,
  news,
}) {
  const [analysis, setAnalysis] = useState(null);
  const [analyzedAt, setAnalyzedAt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!selectedStock?.name) {
      setError("먼저 분석할 종목을 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai-analysis", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          stock: selectedStock,
          price: stockPrice ?? null,
          financials: financialData ?? null,
          news: Array.isArray(news) ? news : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "AI 분석 요청에 실패했습니다.",
        );
      }

      setAnalysis(data.analysis);
      setAnalyzedAt(data.analyzedAt);
    } catch (requestError) {
      console.error("AI 분석 요청 오류:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "AI 분석 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formattedAnalyzedAt = analyzedAt
    ? new Date(analyzedAt).toLocaleString("ko-KR")
    : "";

  return (
    <section className="card ai-analysis-card">
      <div className="ai-analysis-header">
        <div>
          <span className="ai-analysis-label">
            AI INVESTMENT INSIGHT
          </span>

        

          <p>
            주가, 재무정보와 최근 뉴스를 종합해 핵심 내용을
            정리합니다.
          </p>
        </div>

        <button
          type="button"
          className="ai-analysis-button"
          onClick={handleAnalyze}
          disabled={isLoading || !selectedStock?.name}
        >
          {isLoading ? "분석 중..." : "AI 분석하기"}
        </button>
      </div>

      {!selectedStock?.name && (
        <div className="ai-analysis-empty">
          종목을 검색하고 선택하면 AI 분석을 실행할 수 있습니다.
        </div>
      )}

      {error && (
        <div className="ai-analysis-error" role="alert">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="ai-analysis-loading">
          <div className="ai-loading-spinner" />
          <p>{selectedStock.name} 데이터를 분석하고 있습니다.</p>
        </div>
      )}

      {!isLoading && analysis && (
        <div className="ai-analysis-result">
          <section className="ai-analysis-summary">
            <h3>종합 요약</h3>
            <p>{analysis.summary}</p>
          </section>

          <div className="ai-analysis-grid">
            <section className="ai-analysis-section">
              <h3>재무 분석</h3>
              <p>
                {analysis.financialAnalysis ||
                  "재무 데이터가 부족합니다."}
              </p>
            </section>

            <section className="ai-analysis-section">
              <h3>뉴스 분석</h3>
              <p>
                {analysis.newsAnalysis ||
                  "분석할 뉴스 데이터가 부족합니다."}
              </p>
            </section>
          </div>

          <div className="ai-analysis-grid">
            <AnalysisList
              title="긍정 요인"
              items={analysis.positiveFactors}
              type="positive"
            />

            <AnalysisList
              title="위험 요인"
              items={analysis.riskFactors}
              type="risk"
            />
          </div>

          <section className="ai-analysis-view">
            <h3>투자 관점</h3>
            <p>{analysis.investmentView}</p>
          </section>

          {analysis.dataLimitations && (
            <section className="ai-analysis-limitations">
              <h4>분석 데이터 한계</h4>
              <p>{analysis.dataLimitations}</p>
            </section>
          )}

          <footer className="ai-analysis-footer">
            <p>
              {analysis.disclaimer ||
                "본 분석은 참고용이며 투자 판단과 책임은 사용자에게 있습니다."}
            </p>

            {formattedAnalyzedAt && (
              <time dateTime={analyzedAt}>
                분석 시각: {formattedAnalyzedAt}
              </time>
            )}
          </footer>
        </div>
      )}
    </section>
  );
}

export default AIAnalysis;