import Search from 'lucide-react/dist/esm/icons/search.mjs'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ProjectCard } from './components/ProjectCard.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { selectProjectSummaries } from '../../state/selectors.js'
import styles from './ProjectListPage.module.css'

/**
 * Project overview route backed by the current mock repository.
 */
export function ProjectListPage() {
  const [query, setQuery] = useState('')
  const { state } = useTeamFlow()
  const navigate = useNavigate()
  const projects = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    return selectProjectSummaries(state).filter((project) =>
      !normalized || project.name.toLocaleLowerCase('ko-KR').includes(normalized) || project.description.toLocaleLowerCase('ko-KR').includes(normalized))
  }, [query, state])

  return (
    <section className={styles.page} aria-labelledby="projects-page-title">
      <header className={styles.header}>
        <div>
          <h1 id="projects-page-title">내 프로젝트</h1>
          <p>참여 중인 팀플·공모전 프로젝트를 한눈에 확인하세요.</p>
        </div>

        <label className={styles.searchField}>
          <Search aria-hidden="true" size={17} strokeWidth={1.8} />
          <span className={styles.visuallyHidden}>프로젝트 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="프로젝트 검색"
          />
        </label>
      </header>

      <div className={styles.results} aria-live="polite">
        {projects.length === 0 ? (
          <p className={styles.message}>검색 결과가 없습니다.</p>
        ) : null}

        {projects.length > 0 ? (
          <div className={styles.grid}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onSelect={() => navigate(`/projects/${project.id}`)} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
