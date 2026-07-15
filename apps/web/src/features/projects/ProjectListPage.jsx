import Search from 'lucide-react/dist/esm/icons/search.mjs'
import { useEffect, useState } from 'react'

import { ProjectCard } from './components/ProjectCard.jsx'
import { projectRepository } from './data/mockProjectRepository.js'
import styles from './ProjectListPage.module.css'

/**
 * Project overview route backed by the current mock repository.
 */
export function ProjectListPage() {
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()

    setStatus('loading')
    projectRepository
      .list({ query, signal: controller.signal })
      .then((nextProjects) => {
        setProjects(nextProjects)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setProjects([])
          setStatus('error')
        }
      })

    return () => controller.abort()
  }, [query])

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

      <div className={styles.results} aria-busy={status === 'loading'} aria-live="polite">
        {status === 'error' ? (
          <p className={styles.message}>프로젝트를 불러오지 못했습니다.</p>
        ) : null}

        {status === 'ready' && projects.length === 0 ? (
          <p className={styles.message}>검색 결과가 없습니다.</p>
        ) : null}

        {projects.length > 0 ? (
          <div className={styles.grid}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
