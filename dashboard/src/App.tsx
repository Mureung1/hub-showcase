import './styles.css';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

export type Project = {
  id: string;
  title: string;
  summary: string;
  category: string;
  featureTags: string[];
  techStack: string[];
  githubUser: string;
  thumbnailUrl: string;
  problem?: string;
  targetUsers?: string[];
  features?: string[];
  techHighlights?: string[];
  screenshots?: string[];
  screenshotUrls?: string[];
  demoUrl?: string;
  sourceBranch?: string | null;
  agent?: {
    summary?: string;
    agents?: string[];
    skills?: string[];
    workflows?: string[];
  };
  isDummy?: boolean;
};

type AppProps = {
  projects: Project[];
};

export default function App({ projects }: AppProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const selectedAgentTags = selectedProject
    ? [
      ...(selectedProject.agent?.agents ?? []),
      ...(selectedProject.agent?.skills ?? []),
      ...(selectedProject.agent?.workflows ?? []),
    ].slice(0, 8)
    : [];
  const selectedScreenshots = selectedProject?.screenshotUrls ?? selectedProject?.screenshots ?? [];

  const openProject = (project: Project) => setSelectedProject(project);

  const handleCardKeyDown = (event: KeyboardEvent, project: Project) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProject(project);
    }
  };

  return (
    <>
      <header className="camp-banner">
        <span>AI Agent Challenge 2026</span>
        <img
          src="./camp-banner.webp"
          alt="네이버 커넥트재단, 서울대학교, 대학연대 지역인재양성 사업단"
        />
      </header>

      <main className="page">
        <nav className="categories" aria-label="프로젝트 분야">
          <button className="category-tab active" type="button">
            전체 <strong>{projects.length}</strong>
          </button>
        </nav>

        <p className="result-count">{projects.length}개 프로젝트</p>

        <section className="project-grid" aria-label="프로젝트 목록">
          {projects.map((project) => (
            <article
              className="project-card"
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => openProject(project)}
              onKeyDown={(event) => handleCardKeyDown(event, project)}
              aria-label={`${project.title} 상세 보기`}
            >
              <img
                className="thumbnail"
                src={project.thumbnailUrl}
                alt={`${project.title} 대표 화면`}
                width="1200"
                loading="lazy"
                decoding="async"
              />
              <div className="card-content">
                <div className="card-meta">
                  <span className="project-category">{project.category}</span>
                  {project.isDummy && <span className="dummy-badge">더미</span>}
                </div>
                <h2>{project.title}</h2>
                <p className="summary">{project.summary}</p>

                {project.featureTags.length > 0 && (
                  <div className="tags" aria-label="기능 태그">
                    {project.featureTags.map((tag) => (
                      <span className="tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                )}

                {project.techStack.length > 0 && (
                  <div className="tech-stack" aria-label="기술">
                    {project.techStack.map((tech) => (
                      <span className="tech" key={tech}>{tech}</span>
                    ))}
                  </div>
                )}

                <footer>@{project.githubUser}</footer>
                <span className="card-action">상세 보기 <span aria-hidden="true">↗</span></span>
              </div>
            </article>
          ))}
        </section>
      </main>

      {selectedProject && (
        <div className="detail-layer" onClick={() => setSelectedProject(null)}>
          <aside
            className="detail-panel"
            aria-label={`${selectedProject.title} 상세 정보`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-detail"
              type="button"
              onClick={() => setSelectedProject(null)}
              aria-label="상세 보기 닫기"
            >
              ×
            </button>
            <img
              className="detail-thumbnail"
              src={selectedProject.thumbnailUrl}
              alt={`${selectedProject.title} 대표 화면`}
            />
            <div className="detail-content">
              <div className="card-meta">
                <span className="project-category">{selectedProject.category}</span>
                {selectedProject.isDummy && <span className="dummy-badge">더미</span>}
              </div>
              <h2>{selectedProject.title}</h2>
              <p className="detail-summary">{selectedProject.summary}</p>

              {selectedProject.problem && (
                <section className="detail-section">
                  <h3>해결하려는 문제</h3>
                  <p>{selectedProject.problem}</p>
                </section>
              )}

              {selectedProject.features && selectedProject.features.length > 0 && (
                <section className="detail-section">
                  <h3>주요 기능</h3>
                  <ul>{selectedProject.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                </section>
              )}

              {selectedProject.targetUsers && selectedProject.targetUsers.length > 0 && (
                <section className="detail-section">
                  <h3>대상 사용자</h3>
                  <ul>{selectedProject.targetUsers.map((user) => <li key={user}>{user}</li>)}</ul>
                </section>
              )}

              {selectedProject.techHighlights && selectedProject.techHighlights.length > 0 && (
                <section className="detail-section">
                  <h3>기술적 특징</h3>
                  <ul>{selectedProject.techHighlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
                </section>
              )}

              {selectedProject.agent && (selectedProject.agent.summary || selectedAgentTags.length > 0) && (
                <section className="detail-section">
                  <h3>Agent 활용</h3>
                  {selectedProject.agent.summary && <p>{selectedProject.agent.summary}</p>}
                  {selectedAgentTags.length > 0 && (
                    <div className="tags detail-tags">
                      {selectedAgentTags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                    </div>
                  )}
                </section>
              )}

              {selectedScreenshots.length > 0 && (
                <section className="detail-section">
                  <h3>추가 화면</h3>
                  <div className="detail-screenshots">
                    {selectedScreenshots.map((screenshot, index) => (
                      <img key={screenshot} src={screenshot} alt={`${selectedProject.title} 화면 ${index + 1}`} />
                    ))}
                  </div>
                </section>
              )}

              {(selectedProject.demoUrl || selectedProject.sourceBranch) && <div className="detail-links">
                {selectedProject.demoUrl && <a href={selectedProject.demoUrl} target="_blank" rel="noreferrer">서비스 열기 ↗</a>}
                {selectedProject.sourceBranch && <a href={`https://github.com/connect-AIAgentChallenge-26-1/hub/tree/${selectedProject.sourceBranch}`} target="_blank" rel="noreferrer">소스 보기 ↗</a>}
              </div>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
