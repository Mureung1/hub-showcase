import Search from 'lucide-react/dist/esm/icons/search.mjs'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ProjectCard } from './components/ProjectCard.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { selectProjectSummaries } from '../../state/selectors.js'
import styles from './ProjectListPage.module.css'

/**
 * Project overview backed by the authenticated API or the read-only demo repository.
 */
export function ProjectListPage() {
  const [query, setQuery] = useState('')
  const { state, capabilities } = useTeamFlow()
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
          <div className={styles.message}><strong>{query ? '검색 결과가 없습니다.' : '아직 프로젝트가 없습니다.'}</strong><span>{query ? '다른 검색어를 입력해 보세요.' : capabilities.projects ? '왼쪽의 새 프로젝트 버튼으로 첫 프로젝트를 만들어 보세요.' : '게스트 데모를 불러오지 못했습니다.'}</span></div>
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
