import type {
  RepositoryAnalysisEvidence,
  RepositoryAnalysisResult,
} from "@ptop/contracts";
import type { ReactNode } from "react";

type AnalysisResultProps = {
  result: RepositoryAnalysisResult;
};

export type AnalysisResultViewModel = {
  repository: RepositoryAnalysisResult["repository"];
  contributors: RepositoryAnalysisResult["contributors"];
  commits: RepositoryAnalysisResult["commits"];
  contributionNotice: string;
  readme: RepositoryAnalysisResult["analysis"]["repositorySnapshot"];
  languages: RepositoryAnalysisResult["analysis"]["techStack"]["languages"];
  packageManager: string | null;
  frameworks: string[];
  dependencies: string[];
  scripts: string[];
  fileCount: number;
  topLevelDirectories: string[];
  entryPoints: string[];
  testPaths: string[];
  ciPaths: string[];
  deploymentPaths: string[];
  treeTruncated: boolean;
  qualitySignals: RepositoryAnalysisResult["analysis"]["qualitySignals"];
  collaborationSummary: RepositoryAnalysisResult["analysis"]["collaborationSummary"];
  technicalChallenges: RepositoryAnalysisResult["analysis"]["technicalChallenges"];
  pullRequestCount: number;
  issueCount: number;
  warnings: string[];
  evidence: RepositoryAnalysisEvidence[];
};

export function getAnalysisResultViewModel(
  result: RepositoryAnalysisResult,
): AnalysisResultViewModel {
  const { analysis } = result;

  return {
    repository: result.repository,
    contributors: result.contributors,
    commits: result.commits.slice(0, 8),
    contributionNotice: result.contributionSummary.notice,
    readme: analysis.repositorySnapshot,
    languages: analysis.techStack.languages,
    packageManager: analysis.techStack.packageManager,
    frameworks: analysis.techStack.frameworks,
    dependencies: analysis.techStack.dependencies,
    scripts: analysis.techStack.scripts,
    fileCount: analysis.projectStructure.fileCount,
    topLevelDirectories: analysis.projectStructure.topLevelDirectories,
    entryPoints: analysis.projectStructure.entryPoints,
    testPaths: analysis.projectStructure.testPaths,
    ciPaths: analysis.projectStructure.ciPaths,
    deploymentPaths: analysis.projectStructure.deploymentPaths,
    treeTruncated: analysis.projectStructure.treeTruncated,
    qualitySignals: analysis.qualitySignals,
    collaborationSummary: analysis.collaborationSummary,
    technicalChallenges: analysis.technicalChallenges,
    pullRequestCount: analysis.collaborationSummary.pullRequestCount,
    issueCount: analysis.collaborationSummary.issueCount,
    warnings: analysis.warnings,
    evidence: analysis.evidence,
  };
}

export function AnalysisResult({ result }: AnalysisResultProps) {
  const viewModel = getAnalysisResultViewModel(result);

  return (
    <section className="analysis-result-page" aria-label="Repository 분석 결과">
      <header className="result-heading">
        <span className="section-label">Repository Analysis</span>
        <div className="result-title-row">
          <h2>
            {viewModel.repository.owner}/{viewModel.repository.name}
          </h2>
          <a href={viewModel.repository.url} target="_blank" rel="noreferrer">
            GitHub에서 보기
          </a>
        </div>
        <p>
          {viewModel.repository.description ?? "Repository 설명이 등록되어 있지 않습니다."}
          <span className="result-meta">기본 브랜치: {viewModel.repository.defaultBranch}</span>
        </p>
      </header>

      <div className="result-metrics" aria-label="분석 요약">
        <Metric label="파일" value={`${viewModel.fileCount}`} />
        <Metric label="참여자" value={`${viewModel.contributors.length}명`} />
        <Metric label="Pull Request" value={`${viewModel.collaborationSummary.pullRequestCount}`} />
        <Metric label="Issue" value={`${viewModel.collaborationSummary.issueCount}`} />
      </div>

      <div className="result-grid">
        <ResultCard title="프로젝트 참여자">
          <ul className="contributor-preview">
            {viewModel.contributors.map((contributor) => (
              <li key={contributor.login}>
                <strong>{contributor.login}</strong>
                <span>{contributor.commitCount} commits</span>
                <em>{contributor.commitActivityPercent}%</em>
              </li>
            ))}
          </ul>
          <p>{viewModel.contributionNotice}</p>
        </ResultCard>

        <ResultCard title="최근 커밋">
          {viewModel.commits.length > 0 ? (
            <ul className="work-preview">
              {viewModel.commits.map((commit) => (
                <li key={commit.sha}>
                  <span>{commit.message.split("\n", 1)[0]}</span>
                  <small>
                    {commit.authorLogin ?? "작성자 미상"} · +{commit.additions ?? 0} / -
                    {commit.deletions ?? 0}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>최근 커밋을 찾지 못했습니다.</p>
          )}
        </ResultCard>
      </div>

      <div className="result-grid">
        <ResultCard title="기술 스택">
          <ResultList label="언어" items={formatLanguages(viewModel.languages)} />
          <ResultList label="패키지 매니저" items={viewModel.packageManager ? [viewModel.packageManager] : []} />
          <ResultList label="프레임워크" items={viewModel.frameworks} />
          <ResultList label="스크립트" items={viewModel.scripts} />
        </ResultCard>

        <ResultCard title="협업 활동">
          <dl className="result-definition-list">
            <Definition label="전체 PR" value={`${viewModel.collaborationSummary.pullRequestCount}`} />
            <Definition label="머지된 PR" value={`${viewModel.collaborationSummary.mergedPullRequestCount}`} />
            <Definition label="열린 PR" value={`${viewModel.collaborationSummary.openPullRequestCount}`} />
            <Definition label="전체 Issue" value={`${viewModel.collaborationSummary.issueCount}`} />
            <Definition label="열린 Issue" value={`${viewModel.collaborationSummary.openIssueCount}`} />
            <Definition label="리뷰" value={`${viewModel.collaborationSummary.reviewCount}`} />
          </dl>
        </ResultCard>
      </div>

      <ResultCard title="프로젝트 구조" className="result-card-wide">
        <ResultList label="최상위 디렉터리" items={viewModel.topLevelDirectories} />
        <ResultList label="진입점" items={viewModel.entryPoints} />
        <ResultList label="테스트 경로" items={viewModel.testPaths} />
        <ResultList label="CI 경로" items={viewModel.ciPaths} />
        <ResultList label="배포 설정" items={viewModel.deploymentPaths} />
        {viewModel.treeTruncated && <p className="result-warning">파일 구조가 일부만 반환되었습니다.</p>}
      </ResultCard>

      <ResultCard title="기술적 도전 후보" className="result-card-wide">
        {viewModel.technicalChallenges.length > 0 ? (
          <ul className="technical-challenge-list">
            {viewModel.technicalChallenges.map((challenge) => (
              <li key={challenge.title} className="technical-challenge-item">
                <div className="technical-challenge-heading">
                  <h4>{challenge.title}</h4>
                  <div className="technical-challenge-status">
                    <span className="challenge-confidence">
                      신뢰도 {confidenceLabels[challenge.confidence]}
                    </span>
                    {challenge.requiresUserConfirmation && (
                      <span className="challenge-confirmation">사용자 확인 필요</span>
                    )}
                  </div>
                </div>
                <p>{challenge.summary}</p>
                <dl className="challenge-details">
                  {challenge.background && <Definition label="Background" value={challenge.background} />}
                  {challenge.problem && <Definition label="Problem" value={challenge.problem} />}
                  {challenge.solution && <Definition label="Solution" value={challenge.solution} />}
                  <Definition label="기술적 도전" value={challenge.technicalChallenge} />
                  <Definition label="의미" value={challenge.whyItMatters} />
                </dl>
                <div className="challenge-evidence">
                  <span>근거</span>
                  <ul className="evidence-list">
                    {challenge.evidence.map((item, index) => (
                      <li key={`${item.evidenceType}-${item.referenceId ?? item.filePath ?? index}`}>
                        <span className="evidence-type">{evidenceTypeLabels[item.evidenceType]}</span>
                        <div>
                          <strong>{item.title}</strong>
                          {item.filePath && <small>{item.filePath}</small>}
                        </div>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noreferrer">
                            열기
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>현재 데이터만으로 기술적 도전 후보를 만들 수 없습니다.</p>
        )}
      </ResultCard>

      <div className="result-grid">
        <ResultCard title="품질 신호">
          <ul className="signal-list">
            {Object.entries(viewModel.qualitySignals).map(([key, value]) => (
              <li key={key} data-active={value}>
                <span>{qualitySignalLabels[key] ?? key}</span>
                <strong>{value ? "확인됨" : "확인되지 않음"}</strong>
              </li>
            ))}
          </ul>
        </ResultCard>

        <ResultCard title="README 요약">
          {viewModel.readme.readmeAvailable && viewModel.readme.readmeExcerpt ? (
            <p className="readme-excerpt">{viewModel.readme.readmeExcerpt}</p>
          ) : (
            <p>README를 찾지 못했습니다.</p>
          )}
        </ResultCard>
      </div>

      <ResultCard title="분석 근거" className="result-card-wide">
        {viewModel.evidence.length > 0 ? (
          <ul className="evidence-list">
            {viewModel.evidence.slice(0, 12).map((item, index) => (
              <li key={`${item.evidenceType}-${item.referenceId ?? item.title}-${index}`}>
                <span className="evidence-type">{evidenceTypeLabels[item.evidenceType]}</span>
                <div>
                  <strong>{item.title}</strong>
                  {item.filePath && <small>{item.filePath}</small>}
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    열기
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>표시할 분석 근거가 없습니다.</p>
        )}
      </ResultCard>

      {viewModel.warnings.length > 0 && (
        <div className="result-warning-box" role="note">
          <strong>일부 데이터 확인 필요</strong>
          <ul>
            {viewModel.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`result-card ${className}`}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function ResultList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="result-list">
      <span>{label}</span>
      {items.length > 0 ? (
        <ul className="result-tags">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <strong className="result-empty">없음</strong>
      )}
    </div>
  );
}

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatLanguages(languages: Record<string, number>): string[] {
  return Object.entries(languages).map(([language, percentage]) => `${language} ${percentage}%`);
}

const qualitySignalLabels: Record<string, string> = {
  hasReadme: "README",
  hasTests: "테스트 파일",
  hasTypeScript: "TypeScript",
  hasCi: "CI 설정",
  hasDeploymentConfig: "배포 설정",
  hasLintScript: "Lint 스크립트",
  hasTestScript: "Test 스크립트",
};

const evidenceTypeLabels: Record<RepositoryAnalysisEvidence["evidenceType"], string> = {
  commit: "Commit",
  pull_request: "Pull Request",
  issue: "Issue",
  file: "File",
  config: "Config",
  release: "Release",
};

const confidenceLabels = {
  high: "높음",
  medium: "보통",
  low: "낮음",
} as const;
