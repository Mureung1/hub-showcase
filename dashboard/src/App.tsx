import './styles.css';

export type Project = {
  id: string;
  title: string;
  summary: string;
  category: string;
  featureTags: string[];
  techStack: string[];
  githubUser: string;
  thumbnailUrl: string;
  isDummy?: boolean;
};

type AppProps = {
  projects: Project[];
};

export default function App({ projects }: AppProps) {
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
            <article className="project-card" key={project.id}>
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

                <div className="tags" aria-label="기능 태그">
                  {project.featureTags.map((tag) => (
                    <span className="tag" key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="tech-stack" aria-label="기술">
                  {project.techStack.map((tech) => (
                    <span className="tech" key={tech}>{tech}</span>
                  ))}
                </div>

                <footer>@{project.githubUser}</footer>
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
