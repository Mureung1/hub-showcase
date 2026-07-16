import type { RepositoryAnalysisResult } from "@ptop/contracts";

type AnalysisResultProps = {
  result: RepositoryAnalysisResult;
};

export function AnalysisResult({ result }: AnalysisResultProps) {
  return (
    <section className="analysis-result-page" aria-label="Repository 분석 결과">
      <div className="result-heading">
        <span className="section-label">Analysis Result</span>
        <h2>{result.repository.owner}/{result.repository.name}</h2>
        <p>{result.repository.description ?? "Repository 설명이 등록되어 있지 않습니다."}</p>
        <a href={result.repository.url} target="_blank" rel="noreferrer">
          GitHub에서 보기
        </a>
      </div>

      <div className="result-grid">
        <article>
          <h3>프로젝트 참여자</h3>
          <ul className="contributor-preview">
            {result.contributors.map((contributor) => (
              <li key={contributor.login}>
                <strong>{contributor.login}</strong>
                <span>{contributor.commitCount} commits</span>
                <em>{contributor.commitActivityPercent}%</em>
              </li>
            ))}
          </ul>
          <p>{result.contributionSummary.notice}</p>
        </article>

        <article>
          <h3>최근 커밋</h3>
          {result.commits.length > 0 ? (
            <ul className="work-preview">
              {result.commits.slice(0, 8).map((commit) => (
                <li key={commit.sha}>
                  {commit.message.split("\n", 1)[0]}
                  {commit.authorLogin && <span>{commit.authorLogin}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p>최근 커밋을 찾지 못했습니다.</p>
          )}
        </article>
      </div>
    </section>
  );
}
