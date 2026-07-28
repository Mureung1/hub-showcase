import './styles.css';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

const categoryGroups = [
  { id: 'all', label: '전체' },
  { id: 'small-business', label: '소상공인' },
  { id: 'university', label: '대학생' },
  { id: 'daily-life', label: '지역·생활' },
] as const;

type CategoryGroupId = typeof categoryGroups[number]['id'];

const categoryLabels: Record<Exclude<CategoryGroupId, 'all'>, string> = {
  'small-business': '소상공인',
  university: '대학생',
  'daily-life': '지역·생활',
};

function categoryGroupFor(project: Project): Exclude<CategoryGroupId, 'all'> {
  const category = project.category ?? '';
  if (category === '소상공인 운영' || category === '지역 상권과 홍보' || category === '소상공인') {
    return 'small-business';
  }
  if (category === '대학 생활' || category === '학습과 진로' || category === '대학생') return 'university';

  const text = [
    project.title,
    project.summary,
    project.problem,
    ...(project.targetUsers ?? []),
    ...(project.features ?? []),
    ...(project.featureTags ?? []),
  ].join(' ').toLocaleLowerCase();

  const smallBusinessKeywords = [
    '소상공인', '자영업', '매장', '가게', '상점', '점포', '사장', '매출', '재고',
    '주문', '상권', '지원금', '쿠폰', '예약 관리', '배달',
  ];
  if (smallBusinessKeywords.some((keyword) => text.includes(keyword))) return 'small-business';

  const universityKeywords = [
    '대학생', '대학 생활', '캠퍼스', '수강', '학업', '과제', '시험', '진로', '취업',
    '동아리', '자취', '기숙사', '학생',
  ];
  if (universityKeywords.some((keyword) => text.includes(keyword))) return 'university';

  return 'daily-life';
}

function categoryLabelFor(project: Project) {
  if (project.isDummy && project.category) return project.category;
  if (project.category === '소상공인 운영' || project.category === '지역 상권과 홍보') return '소상공인';
  if (project.category === '대학 생활' || project.category === '학습과 진로') return '대학생';
  return categoryLabels[categoryGroupFor(project)];
}

export type Project = {
  id: string;
  title: string;
  summary: string;
  category?: string;
  developmentWithAI?: string;
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
  demoVideoUrl?: string;
  sourceBranch?: string | null;
  dataWarnings?: string[];
  qualityScore?: number;
  imageFallback?: boolean;
  agent?: {
    summary?: string;
    agentTools?: Array<{ type: 'agent' | 'skill'; name: string; purpose: string }>;
    workflows?: Array<{ name: string; steps: string[] }>;
  };
  isDummy?: boolean;
};

type AppProps = {
  projects: Project[];
};

export default function App({ projects }: AppProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryGroupId>('all');
  const selectedScreenshots = selectedProject?.screenshotUrls ?? selectedProject?.screenshots ?? [];

  const openProject = (project: Project) => setSelectedProject(project);

  const handleCardKeyDown = (event: KeyboardEvent, project: Project) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProject(project);
    }
  };

  const cardFeatureTags = (project: Project) => project.featureTags.slice(0, 3);
  const cardTechStack = (project: Project) => project.techStack.slice(0, 4);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredProjects = projects.filter((project) => {
    const matchesCategory = activeCategory === 'all' || categoryGroupFor(project) === activeCategory;
    if (!matchesCategory) return false;

    if (!normalizedQuery) return true;
    const searchableText = [
      project.title,
      project.summary,
      project.category,
      ...project.featureTags,
      ...project.techStack,
      project.githubUser,
      project.problem,
      ...(project.targetUsers ?? []),
      ...(project.features ?? []),
      ...(project.techHighlights ?? []),
      project.agent?.summary,
      ...(project.agent?.agentTools ?? []).flatMap((tool) => [tool.name, tool.purpose]),
      ...(project.agent?.workflows ?? []).flatMap((workflow) => [workflow.name, ...workflow.steps]),
      project.developmentWithAI,
    ].filter(Boolean).join(' ').toLocaleLowerCase();
    return searchableText.includes(normalizedQuery);
  });

  return (
    <>
      <header className="camp-banner">
        <span className="camp-title" aria-label="AI Agent Challenge 2026">
          <strong>AI</strong>
          <span>Agent Challenge</span>
          <em>2026</em>
        </span>
        <img
          src="./camp-logo.png"
          alt="네이버 커넥트재단, 서울대학교, 대학연대 지역인재양성 사업단"
        />
      </header>

      <main className="page">
        <nav className="categories" aria-label="프로젝트 분야">
          {categoryGroups.map((category) => {
            const count = category.id === 'all'
              ? projects.length
              : projects.filter((project) => categoryGroupFor(project) === category.id).length;
            return (
              <button
                className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
                type="button"
                key={category.id}
                aria-selected={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.label} <strong>{count}</strong>
              </button>
            );
          })}
        </nav>

        <div className="search-row">
          <label className="search-box">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="프로젝트, 기능, 기술, Agent 검색"
              aria-label="프로젝트 검색"
            />
            {query && (
              <button className="clear-search" type="button" onClick={() => setQuery('')} aria-label="검색어 지우기">
                ×
              </button>
            )}
          </label>
          <p className="result-count">{filteredProjects.length}개 프로젝트</p>
        </div>

        <section className="project-grid" aria-label="프로젝트 목록">
          {filteredProjects.map((project) => (
            <article
              className="project-card"
              style={{ cursor: 'pointer' }}
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
                  <span className="project-category">{categoryLabelFor(project)}</span>
                  <div className="card-badges">
                    {project.dataWarnings && project.dataWarnings.length > 0 && <span className="warning-badge">{project.imageFallback ? '대표 이미지 자동 선택' : '자료 확인 필요'}</span>}
                    {project.isDummy && <span className="dummy-badge">더미</span>}
                  </div>
                </div>
                <h2>{project.title}</h2>
                <p className="summary">{project.summary}</p>

                {project.featureTags.length > 0 && (
                  <div className="tags" aria-label="기능 태그">
                    {cardFeatureTags(project).map((tag) => (
                      <span className="tag" key={tag}>{tag}</span>
                    ))}
                    {project.featureTags.length > 3 && <span className="tag tag-more">+{project.featureTags.length - 3}</span>}
                  </div>
                )}

                {project.techStack.length > 0 && (
                  <div className="tech-stack" aria-label="기술">
                    {cardTechStack(project).map((tech) => (
                      <span className="tech" key={tech}>{tech}</span>
                    ))}
                    {project.techStack.length > 4 && <span className="tech tech-more">+{project.techStack.length - 4}</span>}
                  </div>
                )}

                <footer>{project.githubUser}</footer>
                <span className="card-action">상세 보기 <span aria-hidden="true">↗</span></span>
              </div>
            </article>
          ))}
        </section>
        {filteredProjects.length === 0 && (
          <p className="empty-results">검색 결과가 없습니다.<br />다른 단어로 검색해보세요.</p>
        )}
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
                <span className="project-category">{categoryLabelFor(selectedProject)}</span>
                <div className="card-badges">
                  {selectedProject.dataWarnings && selectedProject.dataWarnings.length > 0 && <span className="warning-badge">{selectedProject.imageFallback ? '대표 이미지 자동 선택' : '자료 확인 필요'}</span>}
                  {selectedProject.isDummy && <span className="dummy-badge">더미</span>}
                </div>
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

              {selectedProject.agent && (
                selectedProject.agent.summary
                || (selectedProject.agent.agentTools?.length ?? 0) > 0
                || (selectedProject.agent.workflows?.length ?? 0) > 0
              ) && (
                <section className="detail-section agent-section">
                  <h3>Agent 활용</h3>
                  {selectedProject.agent.summary && <p>{selectedProject.agent.summary}</p>}
                  {selectedProject.agent.agentTools && selectedProject.agent.agentTools.length > 0 && (
                    <div className="agent-groups">
                      {(['agent', 'skill'] as const).map((type) => {
                        const tools = selectedProject.agent?.agentTools?.filter((tool) => tool.type === type) ?? [];
                        if (tools.length === 0) return null;
                        return (
                          <div className="agent-group" key={type}>
                            <h4>{type === 'agent' ? 'Agents' : 'Skills'}</h4>
                            <ul>
                              {tools.map((tool) => <li key={tool.name}><strong>{tool.name}</strong> — {tool.purpose}</li>)}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {selectedProject.developmentWithAI && (
                    <div className="agent-group ai-process">
                      <h4>AI와 함께 개발한 과정</h4>
                      <p>{selectedProject.developmentWithAI}</p>
                    </div>
                  )}
                  {selectedProject.agent.workflows && selectedProject.agent.workflows.length > 0 && (
                    <div className="agent-groups">
                      <div className="agent-group">
                        <h4>Workflows</h4>
                        {selectedProject.agent.workflows.map((workflow) => (
                          <div className="workflow" key={workflow.name}>
                            <strong>{workflow.name}</strong>
                            <ol>{workflow.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                          </div>
                        ))}
                      </div>
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

              {(selectedProject.demoUrl || selectedProject.demoVideoUrl || selectedProject.sourceBranch) && <div className="detail-links">
                {selectedProject.demoUrl && <a href={selectedProject.demoUrl} target="_blank" rel="noreferrer">서비스 열기 ↗</a>}
                {selectedProject.demoVideoUrl && <a href={selectedProject.demoVideoUrl} target="_blank" rel="noreferrer">시연 영상 보기 ↗</a>}
                {selectedProject.sourceBranch && <a href={`https://github.com/connect-AIAgentChallenge-26-1/hub/tree/${selectedProject.sourceBranch}`} target="_blank" rel="noreferrer">소스 보기 ↗</a>}
              </div>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
