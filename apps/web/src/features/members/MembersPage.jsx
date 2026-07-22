import MailPlus from 'lucide-react/dist/esm/icons/mail-plus.mjs'
import Pencil from 'lucide-react/dist/esm/icons/pencil.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Avatar } from '../../components/ui/Avatar.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { selectProject } from '../../state/selectors.js'
import workspace from '../../styles/workspace.module.css'
import { AddMemberModal } from './AddMemberModal.jsx'
import { EditMemberModal } from './EditMemberModal.jsx'
import { InviteCollaboratorModal } from './InviteCollaboratorModal.jsx'
import { MemberRemovalModal } from './MemberRemovalModal.jsx'
import styles from './MembersPage.module.css'

export function MembersPage() {
  const { projectId } = useParams()
  const { state, capabilities, actions, readOnly } = useTeamFlow()
  const { reloadOnEntry } = actions
  const [showAdd, setShowAdd] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [cancellingInvitationId, setCancellingInvitationId] = useState(null)
  const [invitationError, setInvitationError] = useState('')
  const project = projectId ? selectProject(state, projectId) : null
  const members = project ? state.members.filter((member) => project.memberIds.includes(member.id)) : state.members
  const projectTasks = project ? state.tasks.filter((task) => task.projectId === project.id) : state.tasks
  const collaborators = members.filter(isLinkedUser)
  const assignees = members.filter((member) => !isLinkedUser(member))
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
          <div className={styles.grid}>{members.map((member) => <MemberCard key={member.id} member={member} tasks={projectTasks.filter((task) => task.assigneeId === member.id)} projects={projectByMember.get(member.id) ?? []} />)}</div>
          {members.length === 0 ? <p className={workspace.empty}>등록된 팀원이 없습니다.</p> : null}
        </div>
      </section>
    )
  }

  const canManage = capabilities.members
  return (
    <section className={workspace.scrollPage} aria-labelledby="members-title">
      <div className={`${workspace.container} ${workspace.containerNarrow}`}>
        <header className={workspace.pageHeader}>
          <div><p>{project.name} · 팀원</p><h1 id="members-title">팀원 관리</h1></div>
          {canManage ? <div className={styles.headerActions}><button className={workspace.secondaryButton} type="button" aria-label="팀원 추가" onClick={() => setShowAdd(true)}><Plus size={15} />담당자 추가</button><button className={workspace.primaryButton} type="button" onClick={() => setShowInvite(true)}><MailPlus size={15} />협업자 초대</button></div> : null}
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

        <section className={styles.memberSection} aria-labelledby="assignees-title">
          <header className={styles.sectionTitle}><div><h2 id="assignees-title">담당자</h2><p>로그인 계정 없이 할 일을 배정하기 위한 프로젝트 내 담당자입니다.</p></div><span>{assignees.length}명</span></header>
          <div className={styles.grid}>{assignees.map((member) => <MemberCard key={member.id} member={member} tasks={projectTasks.filter((task) => task.assigneeId === member.id)} canManage={canManage && !member.isAi} onEdit={() => setEditingMemberId(member.id)} onRemove={() => setRemovingMemberId(member.id)} />)}</div>
          {assignees.length === 0 ? <p className={styles.sectionEmpty}>추가한 수동 담당자가 없습니다.</p> : null}
        </section>
      </div>

      {showAdd && canManage ? <AddMemberModal projectId={project.id} onClose={() => setShowAdd(false)} /> : null}
      {showInvite && canManage ? <InviteCollaboratorModal projectId={project.id} onClose={() => setShowInvite(false)} /> : null}
      {editingMember && canManage ? <EditMemberModal member={editingMember} onClose={() => setEditingMemberId(null)} /> : null}
      {removingMember && canManage ? <MemberRemovalModal member={removingMember} taskCount={projectTasks.filter((task) => task.assigneeId === removingMember.id).length} isCurrentUser={removingMember.id === currentMemberId} onClose={() => setRemovingMemberId(null)} /> : null}
    </section>
  )
}

function isLinkedUser(member) {
  return member.kind === 'user' || Boolean(member.authUserId)
}

function MemberCard({ member, tasks, projects = [], current = false, canManage = false, onEdit, onRemove }) {
  const linkedUser = isLinkedUser(member)
  return (
    <article className={`${styles.memberCard} ${member.isAi ? styles.aiCard : ''}`}>
      <div className={styles.memberHeader}>
        <Avatar member={member} size="large" />
        <div className={styles.memberIdentity}><div className={styles.nameLine}><h3>{member.name}</h3>{current ? <span>나</span> : member.isAi ? <span>AI</span> : null}</div><p>{member.role}</p>{linkedUser && member.email ? <small>{member.email}</small> : null}</div>
        {canManage ? <div className={styles.cardActions}><button type="button" onClick={onEdit} aria-label={`${member.name} 정보 수정`} title="정보 수정"><Pencil size={13} /></button><button type="button" className={styles.removeButton} onClick={onRemove} aria-label={current ? '프로젝트 나가기' : `${member.name} 제거`} title={current ? '프로젝트 나가기' : '제거'}><Trash2 size={13} /></button></div> : null}
      </div>
      <p className={styles.description}>{member.description || '소개가 없습니다.'}</p>
      {projects.length > 0 ? <div className={styles.chips}>{projects.map((item) => <span key={item.id}>{item.name}</span>)}</div> : null}
      <div className={styles.taskSummary}><div><span>담당 할 일</span><strong>{tasks.length}개</strong></div>{tasks.slice(0, 2).map((task) => <div className={styles.taskLine} key={task.id}><span>{task.title}</span><StatusBadge status={task.status} /></div>)}</div>
    </article>
  )
}
