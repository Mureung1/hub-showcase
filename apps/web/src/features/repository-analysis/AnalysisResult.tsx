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
    <section className="grid gap-6" aria-label="Repository 분석 결과">
      <header className="grid gap-3">
        <span className="text-[0.78rem] font-extrabold uppercase tracking-[0.08em] text-ptop-mint-dark">Repository Analysis</span>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[clamp(1.5rem,3vw,2.35rem)] tracking-[-0.03em]">
            {viewModel.repository.owner}/{viewModel.repository.name}
          </h2>
          <a className="font-extrabold text-ptop-mint-dark underline-offset-4 hover:underline" href={viewModel.repository.url} target="_blank" rel="noreferrer">
            GitHub에서 보기
          </a>
        </div>
        <p className="m-0 leading-[1.6] text-ptop-muted">
          {viewModel.repository.description ?? "Repository 설명이 등록되어 있지 않습니다."}
          <span className="ml-2 text-[0.82rem] text-ptop-muted">기본 브랜치: {viewModel.repository.defaultBranch}</span>
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="분석 요약">
        <Metric label="파일" value={`${viewModel.fileCount}`} />
        <Metric label="참여자" value={`${viewModel.contributors.length}명`} />
        <Metric label="Pull Request" value={`${viewModel.collaborationSummary.pullRequestCount}`} />
        <Metric label="Issue" value={`${viewModel.collaborationSummary.issueCount}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResultCard title="프로젝트 참여자">
          <ul className="m-0 grid gap-2 p-0">
            {viewModel.contributors.map((contributor) => (
              <li className="flex items-center gap-2 rounded-lg border border-ptop-line px-3 py-2" key={contributor.login}>
                <strong className="flex-1">{contributor.login}</strong>
                <span className="text-xs text-ptop-muted">{contributor.commitCount} commits</span>
                <em className="not-italic text-sm font-bold text-ptop-mint-dark">{contributor.commitActivityPercent}%</em>
              </li>
            ))}
          </ul>
          <p className="m-0 text-sm leading-[1.5] text-ptop-muted">{viewModel.contributionNotice}</p>
        </ResultCard>

        <ResultCard title="최근 커밋">
          {viewModel.commits.length > 0 ? (
            <ul className="m-0 grid gap-2 p-0">
              {viewModel.commits.map((commit) => (
                <li className="grid gap-1 rounded-lg border border-ptop-line px-3 py-2" key={commit.sha}>
                  <span className="font-bold">{commit.message.split("\n", 1)[0]}</span>
                  <small className="text-xs text-ptop-muted">
                    {commit.authorLogin ?? "작성자 미상"} · +{commit.additions ?? 0} / -
                    {commit.deletions ?? 0}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-ptop-muted">최근 커밋을 찾지 못했습니다.</p>
          )}
        </ResultCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResultCard title="기술 스택">
          <ResultList label="언어" items={formatLanguages(viewModel.languages)} />
          <ResultList label="패키지 매니저" items={viewModel.packageManager ? [viewModel.packageManager] : []} />
          <ResultList label="프레임워크" items={viewModel.frameworks} />
          <ResultList label="스크립트" items={viewModel.scripts} />
        </ResultCard>

        <ResultCard title="협업 활동">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Definition label="전체 PR" value={`${viewModel.collaborationSummary.pullRequestCount}`} />
            <Definition label="머지된 PR" value={`${viewModel.collaborationSummary.mergedPullRequestCount}`} />
            <Definition label="열린 PR" value={`${viewModel.collaborationSummary.openPullRequestCount}`} />
            <Definition label="전체 Issue" value={`${viewModel.collaborationSummary.issueCount}`} />
            <Definition label="열린 Issue" value={`${viewModel.collaborationSummary.openIssueCount}`} />
            <Definition label="리뷰" value={`${viewModel.collaborationSummary.reviewCount}`} />
          </dl>
        </ResultCard>
      </div>

      <ResultCard title="프로젝트 구조" className="lg:col-span-2">
        <ResultList label="최상위 디렉터리" items={viewModel.topLevelDirectories} />
        <ResultList label="진입점" items={viewModel.entryPoints} />
        <ResultList label="테스트 경로" items={viewModel.testPaths} />
        <ResultList label="CI 경로" items={viewModel.ciPaths} />
        <ResultList label="배포 설정" items={viewModel.deploymentPaths} />
        {viewModel.treeTruncated && <p className="mt-3 text-sm text-ptop-muted">파일 구조가 일부만 반환되었습니다.</p>}
      </ResultCard>

      <ResultCard title="기술적 도전 후보" className="lg:col-span-2">
        {viewModel.technicalChallenges.length > 0 ? (
          <ul className="grid gap-4">
            {viewModel.technicalChallenges.map((challenge) => (
              <li key={challenge.title} className="grid gap-3 rounded-xl border border-ptop-line bg-ptop-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h4 className="m-0 text-base font-extrabold">{challenge.title}</h4>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-ptop-mint-soft px-2.5 py-1 text-ptop-mint-dark">
                      신뢰도 {confidenceLabels[challenge.confidence]}
                    </span>
                    {challenge.requiresUserConfirmation && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">사용자 확인 필요</span>
                    )}
                  </div>
                </div>
                <p className="m-0 leading-[1.6] text-ptop-muted">{challenge.summary}</p>
                <dl className="grid gap-3 rounded-lg bg-ptop-soft-paper p-3">
                  {challenge.background && <Definition label="Background" value={challenge.background} />}
                  {challenge.problem && <Definition label="Problem" value={challenge.problem} />}
                  {challenge.solution && <Definition label="Solution" value={challenge.solution} />}
                  <Definition label="기술적 도전" value={challenge.technicalChallenge} />
                  <Definition label="의미" value={challenge.whyItMatters} />
                </dl>
                <div className="grid gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-ptop-muted">근거</span>
                  <ul className="grid gap-2">
                    {challenge.evidence.map((item, index) => (
                      <li className="flex flex-wrap items-center gap-2 rounded-lg border border-ptop-line px-3 py-2 text-sm" key={`${item.evidenceType}-${item.referenceId ?? item.filePath ?? index}`}>
                        <span className="rounded bg-ptop-mint-soft px-2 py-1 text-xs font-bold text-ptop-mint-dark">{evidenceTypeLabels[item.evidenceType]}</span>
                        <div className="grid min-w-0 flex-1 gap-0.5">
                          <strong>{item.title}</strong>
                          {item.filePath && <small className="truncate text-xs text-ptop-muted">{item.filePath}</small>}
                        </div>
                        {item.url && (
                          <a className="font-bold text-ptop-mint-dark hover:underline" href={item.url} target="_blank" rel="noreferrer">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <ResultCard title="품질 신호">
          <ul className="m-0 grid gap-2 p-0">
            {Object.entries(viewModel.qualitySignals).map(([key, value]) => (
              <li className="flex items-center justify-between gap-3 rounded-lg border border-ptop-line px-3 py-2" key={key} data-active={value}>
                <span className="text-sm">{qualitySignalLabels[key] ?? key}</span>
                <strong className={value ? "text-sm text-ptop-mint-dark" : "text-sm text-ptop-muted"}>{value ? "확인됨" : "확인되지 않음"}</strong>
              </li>
            ))}
          </ul>
        </ResultCard>

        <ResultCard title="README 요약">
          {viewModel.readme.readmeAvailable && viewModel.readme.readmeExcerpt ? (
            <p className="m-0 whitespace-pre-wrap leading-[1.65] text-ptop-muted">{viewModel.readme.readmeExcerpt}</p>
          ) : (
          <p className="m-0 text-sm text-ptop-muted">README를 찾지 못했습니다.</p>
          )}
        </ResultCard>
      </div>

      <ResultCard title="분석 근거" className="lg:col-span-2">
        {viewModel.evidence.length > 0 ? (
          <ul className="grid gap-2">
            {viewModel.evidence.slice(0, 12).map((item, index) => (
              <li className="flex flex-wrap items-center gap-2 rounded-lg border border-ptop-line px-3 py-2 text-sm" key={`${item.evidenceType}-${item.referenceId ?? item.title}-${index}`}>
                <span className="rounded bg-ptop-mint-soft px-2 py-1 text-xs font-bold text-ptop-mint-dark">{evidenceTypeLabels[item.evidenceType]}</span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <strong>{item.title}</strong>
                  {item.filePath && <small className="truncate text-xs text-ptop-muted">{item.filePath}</small>}
                </div>
                {item.url && (
                  <a className="font-bold text-ptop-mint-dark hover:underline" href={item.url} target="_blank" rel="noreferrer">
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
        <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="note">
          <strong className="font-extrabold">일부 데이터 확인 필요</strong>
          <ul className="m-0 list-disc pl-5">
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
    <div className="grid gap-1 rounded-xl border border-ptop-line bg-white p-4 shadow-ptop-surface">
      <span className="text-xs font-bold text-ptop-muted">{label}</span>
      <strong className="text-2xl tracking-[-0.03em]">{value}</strong>
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
    <article className={`grid gap-4 rounded-xl border border-ptop-line bg-white p-5 shadow-ptop-surface ${className}`}>
      <h3 className="m-0 text-lg font-extrabold">{title}</h3>
      {children}
    </article>
  );
}

function ResultList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-extrabold text-ptop-muted">{label}</span>
      {items.length > 0 ? (
        <ul className="m-0 flex flex-wrap gap-2 p-0">
          {items.map((item) => (
          <li className="list-none rounded-full bg-ptop-mint-soft px-2.5 py-1 text-sm text-ptop-mint-dark" key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <strong className="text-sm text-ptop-muted">없음</strong>
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
