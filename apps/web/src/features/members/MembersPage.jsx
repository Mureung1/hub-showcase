import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs'
import Bot from 'lucide-react/dist/esm/icons/bot.mjs'
import MailPlus from 'lucide-react/dist/esm/icons/mail-plus.mjs'
import Pencil from 'lucide-react/dist/esm/icons/pencil.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Avatar } from '../../components/ui/Avatar.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { selectProject } from '../../state/selectors.js'
import workspace from '../../styles/workspace.module.css'
import { EditMemberModal } from './EditMemberModal.jsx'
import { InviteCollaboratorModal } from './InviteCollaboratorModal.jsx'
import { MemberRemovalModal } from './MemberRemovalModal.jsx'
import styles from './MembersPage.module.css'
import { CreateAiAgentModal } from '../ai/CreateAiAgentModal.jsx'

export function MembersPage() {
  const { projectId } = useParams()
  const { state, capabilities, actions, readOnly } = useTeamFlow()
  const { reloadOnEntry } = actions
  const [showInvite, setShowInvite] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [showAiCreate, setShowAiCreate] = useState(false)
  const [cancellingInvitationId, setCancellingInvitationId] = useState(null)
  const [invitationError, setInvitationError] = useState('')
  const project = projectId ? selectProject(state, projectId) : null
  const members = project ? state.members.filter((member) => project.memberIds.includes(member.id)) : state.members
  const projectTasks = project ? state.tasks.filter((task) => task.projectId === project.id) : state.tasks
  const collaborators = members.filter(isCollaborator)
  const aiMembers = members.filter(isAiMember)
  const aiAgentByMemberId = useMemo(
    () => new Map((state.aiAgents ?? []).map((agent) => [agent.memberId, agent])),
    [state.aiAgents],
  )
  const pendingInvitations = project ? (state.invitations ?? []).filter((invitation) => (
    invitation.projectId === project.id && invitation.status === 'pending' && invitation.direction !== 'received'
  )) : []
  const currentMemberId = project ? state.currentMemberIdsByProject?.[project.id] : null
  const editingMember = members.find((member) => member.id === editingMemberId) ?? null
  const removingMember = members.find((member) => member.id === removingMemberId) ?? null
  const projectByMember = useMemo(() => new Map(state.members.map((member) => [member.id, state.projects.filter((candidate) => candidate.memberIds.includes(member.id))])), [state.members, state.projects])

  useEffect(() => {
    if (!readOnly) void reloadOnEntry().catch(() => {})
  }, [projectId, readOnly, reloadOnEntry])

  async function cancelInvitation(invitationId) {
    if (cancellingInvitationId) return
    setCancellingInvitationId(invitationId)
    setInvitationError('')
    try {
      await actions.cancelInvitation(invitationId)
    } catch (error) {
      setInvitationError(error instanceof Error ? error.message : '초대를 취소하지 못했습니다.')
    } finally {
      setCancellingInvitationId(null)
    }
  }

  if (!project) {
    return (
      <section className={workspace.scrollPage} aria-labelledby="members-title">
        <div className={`${workspace.container} ${workspace.containerNarrow}`}>
          <header className={workspace.pageHeader}><div><p>모든 프로젝트 · 통합 관리</p><h1 id="members-title">전체 팀원</h1></div></header>
          <div className={styles.grid}>{members.map((member) => <MemberCard key={member.id} member={member} tasks={projectTasks.filter((task) => task.assigneeId === member.id)} projects={projectByMember.get(member.id) ?? []} aiAgent={aiAgentByMemberId.get(member.id)} manageTo={isAiMember(member) && member.projectId ? `/projects/${member.projectId}/ai?agent=${member.id}` : null} />)}</div>
          {members.length === 0 ? <p className={workspace.empty}>등록된 팀원이 없습니다.</p> : null}
        </div>
      </section>
    )
  }

  const canManage = capabilities.members
  const canManageAi = !readOnly && capabilities.ai
  return (
    <section className={workspace.scrollPage} aria-labelledby="members-title">
      <div className={`${workspace.container} ${workspace.containerNarrow}`}>
        <header className={workspace.pageHeader}>
          <div><p>{project.name} · 팀원</p><h1 id="members-title">팀원 관리</h1></div>
          {canManage ? <div className={styles.headerActions}><button className={workspace.primaryButton} type="button" onClick={() => setShowInvite(true)}><MailPlus size={15} />협업자 초대</button></div> : null}
        </header>

        <section className={styles.memberSection} aria-labelledby="collaborators-title">
          <header className={styles.sectionTitle}><div><h2 id="collaborators-title">협업 사용자</h2><p>Google 계정으로 로그인해 이 프로젝트를 함께 관리하는 사용자입니다.</p></div><span>{collaborators.length}명</span></header>
          <div className={styles.grid}>{collaborators.map((member) => <MemberCard key={member.id} member={member} tasks={projectTasks.filter((task) => task.assigneeId === member.id)} current={member.id === currentMemberId} canManage={canManage} onEdit={() => setEditingMemberId(member.id)} onRemove={() => setRemovingMemberId(member.id)} />)}</div>
          {collaborators.length === 0 ? <p className={styles.sectionEmpty}>연결된 협업 사용자가 없습니다.</p> : null}
          {pendingInvitations.length > 0 ? (
            <div className={styles.pendingInvitations}>
              <div className={styles.pendingTitle}><strong>대기 중인 초대</strong><span>{pendingInvitations.length}건</span></div>
              {invitationError ? <p className={styles.inlineError} role="alert">{invitationError}</p> : null}
              {pendingInvitations.map((invitation) => <div className={styles.pendingInvitation} key={invitation.id}><span><strong>{invitation.inviteeEmail}</strong><small>수락 대기 중</small></span>{canManage ? <button type="button" onClick={() => cancelInvitation(invitation.id)} disabled={Boolean(cancellingInvitationId)} aria-label={`${invitation.inviteeEmail} 초대 취소`}><X size={13} />{cancellingInvitationId === invitation.id ? '취소 중...' : '초대 취소'}</button> : null}</div>)}
            </div>
          ) : null}
        </section>

        <section className={styles.memberSection} aria-labelledby="ai-agents-title">
          <header className={styles.sectionTitle}>
            <div><h2 id="ai-agents-title">AI Agent</h2><p>프로젝트 컨텍스트를 참고해 할 일을 수행하는 팀원 유형입니다.</p></div>
            <div className={styles.sectionActions}>
              <span><b>{aiMembers.length}</b>명</span>
              {canManageAi ? <button type="button" className={workspace.primaryButton} onClick={() => setShowAiCreate(true)}><Plus size={15} aria-hidden="true" />AI Agent 추가</button> : null}
            </div>
          </header>
          {aiMembers.length > 0 ? <div className={styles.grid}>{aiMembers.map((member) => <MemberCard key={member.id} member={member} tasks={projectTasks.filter((task) => task.assigneeId === member.id)} aiAgent={aiAgentByMemberId.get(member.id)} manageTo={`/projects/${project.id}/ai?agent=${member.id}`} />)}</div> : <p className={styles.sectionEmpty}>아직 추가된 AI Agent가 없습니다.</p>}
        </section>

      </div>

      {showInvite && canManage ? <InviteCollaboratorModal projectId={project.id} onClose={() => setShowInvite(false)} /> : null}
      {editingMember && canManage ? <EditMemberModal member={editingMember} onClose={() => setEditingMemberId(null)} /> : null}
      {removingMember && canManage ? <MemberRemovalModal member={removingMember} taskCount={projectTasks.filter((task) => task.assigneeId === removingMember.id).length} isCurrentUser={removingMember.id === currentMemberId} onClose={() => setRemovingMemberId(null)} /> : null}
      {showAiCreate && canManageAi ? <CreateAiAgentModal projectId={project.id} onClose={() => setShowAiCreate(false)} /> : null}
    </section>
  )
}

function isCollaborator(member) {
  return !member.isAi && (member.kind === 'user' || Boolean(member.authUserId))
}

function isAiMember(member) {
  return member.kind === 'ai' || member.isAi
}

function MemberCard({ member, tasks, projects = [], current = false, canManage = false, onEdit, onRemove, aiAgent, manageTo }) {
  const isAi = isAiMember(member)
  return (
    <article className={`${styles.memberCard} ${isAi ? styles.aiCard : ''}`}>
      <div className={styles.memberHeader}>
        <Avatar member={member} size="large" />
        <div className={styles.memberIdentity}><div className={styles.nameLine}><h3>{member.name}</h3>{current ? <span>나</span> : null}</div><p>{member.role}</p>{member.email ? <small>{member.email}</small> : null}</div>
        {canManage && !isAi ? <div className={styles.cardActions}><button type="button" onClick={onEdit} aria-label={`${member.name} 정보 수정`} title="정보 수정"><Pencil size={13} /></button><button type="button" className={styles.removeButton} onClick={onRemove} aria-label={current ? '프로젝트 나가기' : `${member.name} 제거`} title={current ? '프로젝트 나가기' : '제거'}><Trash2 size={13} /></button></div> : null}
      </div>
      <p className={styles.description}>{member.description || '소개가 없습니다.'}</p>
      {isAi ? <div className={styles.aiMeta}><span className={aiAgent?.enabled === false ? styles.aiInactive : styles.aiActive}><Bot size={12} aria-hidden="true" />{aiAgent?.enabled === false ? '비활성' : '활성'}</span>{manageTo ? <Link to={manageTo}>AI 관리<ArrowRight size={13} aria-hidden="true" /></Link> : null}</div> : null}
      {projects.length > 0 ? <div className={styles.chips}>{projects.map((item) => <span key={item.id}>{item.name}</span>)}</div> : null}
      <div className={styles.taskSummary}><div><span>{isAi ? 'AI 담당 할 일' : '담당 할 일'}</span><strong>{tasks.length}개</strong></div>{tasks.slice(0, 2).map((task) => <div className={styles.taskLine} key={task.id}><span>{task.title}</span><StatusBadge status={task.status} /></div>)}</div>
    </article>
  )
}
