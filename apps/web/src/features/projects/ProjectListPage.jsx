import Search from 'lucide-react/dist/esm/icons/search.mjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ProjectCard } from './components/ProjectCard.jsx'
import { ProjectSettingsModal } from './components/ProjectSettingsModal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { selectProjectSummaries } from '../../state/selectors.js'
import styles from './ProjectListPage.module.css'

/**
 * Project overview backed by the authenticated API or the read-only demo repository.
 */
export function ProjectListPage() {
  const [query, setQuery] = useState('')
  const [settingsProjectId, setSettingsProjectId] = useState(null)
  const [pendingInvitationId, setPendingInvitationId] = useState(null)
  const [invitationError, setInvitationError] = useState('')
  const { state, capabilities, readOnly, actions } = useTeamFlow()
  const { reloadOnEntry } = actions
  const navigate = useNavigate()
  const projects = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    return selectProjectSummaries(state).filter((project) =>
      !normalized || project.name.toLocaleLowerCase('ko-KR').includes(normalized) || project.description.toLocaleLowerCase('ko-KR').includes(normalized))
  }, [query, state])
  const receivedInvitations = useMemo(() => (state.invitations ?? []).filter((invitation) => (
    invitation.status === 'pending' && invitation.direction !== 'sent'
  )), [state.invitations])
  const settingsProject = state.projects.find((project) => project.id === settingsProjectId) ?? null

  useEffect(() => {
    if (!readOnly) void reloadOnEntry().catch(() => {})
  }, [readOnly, reloadOnEntry])

  async function respondToInvitation(invitationId, response) {
    if (pendingInvitationId) return
    setPendingInvitationId(invitationId)
    setInvitationError('')
    try {
      await actions[response === 'accept' ? 'acceptInvitation' : 'rejectInvitation'](invitationId)
    } catch (error) {
      setInvitationError(error instanceof Error ? error.message : '초대에 응답하지 못했습니다.')
    } finally {
      setPendingInvitationId(null)
    }
  }

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

      {!readOnly && receivedInvitations.length > 0 ? (
        <section className={styles.invitationPanel} aria-labelledby="received-invitations-title">
          <div className={styles.invitationHeading}>
            <div><h2 id="received-invitations-title">받은 프로젝트 초대</h2><p>초대를 수락하면 같은 프로젝트에서 바로 협업할 수 있습니다.</p></div>
            <span>{receivedInvitations.length}건</span>
          </div>
          {invitationError ? <p className={styles.invitationError} role="alert">{invitationError}</p> : null}
          <div className={styles.invitationList}>
            {receivedInvitations.map((invitation) => {
              const busy = pendingInvitationId === invitation.id
              return (
                <article key={invitation.id} className={styles.invitationItem}>
                  <div><strong>{invitation.projectName || '프로젝트 초대'}</strong><span>{invitation.invitedByName || invitation.inviterName ? `${invitation.invitedByName || invitation.inviterName} 님이 초대했습니다.` : '프로젝트 협업 초대가 도착했습니다.'}</span><small>{invitation.inviteeEmail}</small></div>
                  <div className={styles.invitationActions}>
                    <button type="button" onClick={() => respondToInvitation(invitation.id, 'reject')} disabled={Boolean(pendingInvitationId)}>{busy ? '처리 중' : '거절'}</button>
                    <button type="button" className={styles.acceptButton} onClick={() => respondToInvitation(invitation.id, 'accept')} disabled={Boolean(pendingInvitationId)}>{busy ? '처리 중...' : '수락'}</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      <div className={styles.results} aria-live="polite">
        {projects.length === 0 ? (
          <div className={styles.message}><strong>{query ? '검색 결과가 없습니다.' : '아직 프로젝트가 없습니다.'}</strong><span>{query ? '다른 검색어를 입력해 보세요.' : capabilities.projects ? '왼쪽의 새 프로젝트 버튼으로 첫 프로젝트를 만들어 보세요.' : '게스트 데모를 불러오지 못했습니다.'}</span></div>
        ) : null}

        {projects.length > 0 ? (
          <div className={styles.grid}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onSelect={() => navigate(`/projects/${project.id}`)} onSettings={capabilities.projects ? () => setSettingsProjectId(project.id) : undefined} />
            ))}
          </div>
        ) : null}
      </div>
      {settingsProject && capabilities.projects ? <ProjectSettingsModal project={settingsProject} onClose={() => setSettingsProjectId(null)} /> : null}
    </section>
  )
}
