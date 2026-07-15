import type { AnalysisResultData } from "./repositoryAnalysis";

type AnalysisResultProps = {
  result: AnalysisResultData;
};

export function AnalysisResult({ result }: AnalysisResultProps) {
  return (
    <section className="analysis-result-page" aria-label="Repository 분석 결과">
      <div className="result-heading">
        <span className="section-label">Analysis Result</span>
        <h2>{result.name}</h2>
        <p>{result.summary}</p>
        <a href={result.url} target="_blank" rel="noreferrer">
          GitHub에서 보기
        </a>
      </div>

      {result.isMock && (
        <p className="mock-note">
          현재 화면은 Nest API 연동 전 상태를 검증하기 위한 mock 결과입니다. 이후 실제 GitHub API 응답으로 교체할
          예정입니다.
        </p>
      )}

      <div className="result-grid">
        <article>
          <h3>프로젝트 참여자</h3>
          <ul className="contributor-preview">
            {result.contributors.map((contributor) => (
              <li key={contributor.login}>
                <strong>{contributor.login}</strong>
                <span>{contributor.count} commits</span>
                <em>{contributor.percent}%</em>
              </li>
            ))}
          </ul>
        </article>

        <article>
          <h3>{result.owner}의 주요 작업</h3>
          {result.ownerMessages.length > 0 ? (
            <ul className="work-preview">
              {result.ownerMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : (
            <p>최근 100개 커밋 안에서 repository owner의 커밋을 찾지 못했습니다.</p>
          )}
        </article>
      </div>
    </section>
  );
}
