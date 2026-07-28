import type { SavedPortfolioProject } from "../features/portfolio-library/portfolioLibrary";
import { PortfolioDraftPreview } from "../features/reflection/ReflectionWorkspace";
import { getPortfolioPdfFileName } from "../features/reflection/portfolioDraftView";

type SavedPortfolioPageProps = {
  project: SavedPortfolioProject;
  onBackToWorkspace: () => void;
};

export function SavedPortfolioPage({ project, onBackToWorkspace }: SavedPortfolioPageProps) {
  return (
    <section className="grid gap-6" aria-label="저장된 포트폴리오">
      <button
        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-ptop-line bg-white px-4 text-sm font-bold text-ptop-ink transition hover:-translate-y-px hover:border-ptop-mint-dark"
        type="button"
        onClick={onBackToWorkspace}
      >
        <span aria-hidden="true">←</span>
        작업실로 돌아가기
      </button>
      <header className="grid gap-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-ptop-mint-dark">
          Saved on project room monitor
        </span>
        <h1 className="m-0 text-3xl tracking-[-0.04em]">{project.repositoryName}</h1>
        <p className="m-0 text-sm text-ptop-muted">
          {project.challengeTitle} · {project.status === "needs_user_review" ? "사용자 확인 필요" : "초안 생성 완료"}
        </p>
      </header>
      <PortfolioDraftPreview
        draft={project.portfolioDraft}
        evidence={project.reflectionAnalysis?.matchedChallengeEvidence ?? []}
        pdfFileName={getPortfolioPdfFileName(project.repositoryOwner, project.repositoryName)}
      />
    </section>
  );
}
