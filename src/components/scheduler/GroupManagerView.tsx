import { useState } from 'react'
import type { FormEvent } from 'react'
import { PixelAvatar, getAvatarProps } from './shared'
import type { FriendsManager } from './useFriendsManager'
import type { FriendGroup } from './types'

type GroupManagerViewProps = {
  manager: FriendsManager
  onBack: () => void
}

export function GroupManagerView({ manager, onBack }: GroupManagerViewProps) {
  const [newGroupName, setNewGroupName] = useState('')
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [addingMemberGroupId, setAddingMemberGroupId] = useState<string | null>(null)
  const [confirmingDeleteGroupId, setConfirmingDeleteGroupId] = useState<string | null>(null)

  const submitNewGroup = (event: FormEvent) => {
    event.preventDefault()
    const name = newGroupName.trim()
    if (!name) return
    manager.createGroup(name)
    setNewGroupName('')
  }

  const startRename = (groupId: string, currentName: string) => {
    setRenamingGroupId(groupId)
    setRenameDraft(currentName)
  }

  const commitRename = (groupId: string) => {
    const name = renameDraft.trim()
    setRenamingGroupId(null)
    if (name) manager.renameGroup(groupId, name)
  }

  const handleDeleteClick = (group: FriendGroup) => {
    if (group.members.length === 0) {
      manager.deleteGroup(group.id)
      return
    }
    setConfirmingDeleteGroupId(group.id)
  }

  const confirmDelete = (groupId: string) => {
    manager.deleteGroup(groupId)
    setConfirmingDeleteGroupId(null)
  }

  const confirmingDeleteGroup = manager.groups.find((group) => group.id === confirmingDeleteGroupId) ?? null

  return (
    <section className="group-manager-view" aria-labelledby="group-manager-title">
      <div className="tab-page-heading">
        <div>
          <button type="button" className="group-manager-back" onClick={onBack} aria-label="마이페이지로 돌아가기">←</button>
          <span>MANAGE</span>
          <h1 id="group-manager-title">그룹 관리</h1>
        </div>
      </div>

      {manager.notice && <p className="scheduler-notice" role="status">{manager.notice}</p>}

      <form className="group-create-form" onSubmit={submitNewGroup}>
        <input
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          placeholder="새 그룹 이름 (예: 절친, 스터디)"
          aria-label="새 그룹 이름"
        />
        <button type="submit">그룹 만들기</button>
      </form>

      {manager.groupsLoading ? (
        <p className="empty-agenda">그룹을 불러오는 중이에요...</p>
      ) : manager.groups.length === 0 ? (
        <p className="empty-agenda">아직 만든 그룹이 없어요.</p>
      ) : (
        <div className="group-list">
          {manager.groups.map((group) => {
            const availableFriends = manager.friends.filter(
              (friend) => !group.members.some((member) => member.id === friend.id),
            )

            return (
              <article className="group-card" key={group.id}>
                <div className="group-card-header">
                  {renamingGroupId === group.id ? (
                    <input
                      className="group-card-rename-input"
                      value={renameDraft}
                      autoFocus
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onBlur={() => commitRename(group.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename(group.id)
                        if (event.key === 'Escape') setRenamingGroupId(null)
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="group-card-name"
                      aria-label={`${group.name} 이름 수정`}
                      onClick={() => startRename(group.id, group.name)}
                    >
                      {group.name}
                    </button>
                  )}
                  <button
                    type="button"
                    className="group-delete-button"
                    aria-label={`${group.name} 그룹 삭제`}
                    onClick={() => handleDeleteClick(group)}
                  >
                    삭제
                  </button>
                </div>

                <div className="member-chip-list">
                  {group.members.length === 0 && <span className="member-chip-empty">아직 멤버가 없어요.</span>}
                  {group.members.map((member) => (
                    <span className="member-chip" key={member.id}>
                      <PixelAvatar {...getAvatarProps(member.id)} />
                      {member.name}
                      <button
                        type="button"
                        aria-label={`${member.name} 그룹에서 빼기`}
                        onClick={() => manager.removeGroupMember(group.id, member.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {addingMemberGroupId === group.id ? (
                  <div className="add-member-list">
                    {availableFriends.length === 0 ? (
                      <p>추가할 수 있는 친구가 없어요.</p>
                    ) : (
                      availableFriends.map((friend) => (
                        <button type="button" key={friend.id} onClick={() => manager.addGroupMember(group.id, friend.id)}>
                          {friend.name}
                        </button>
                      ))
                    )}
                    <button type="button" className="add-member-close" onClick={() => setAddingMemberGroupId(null)}>
                      닫기
                    </button>
                  </div>
                ) : (
                  <button type="button" className="add-member-button" onClick={() => setAddingMemberGroupId(group.id)}>
                    + 멤버 추가
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}

      {confirmingDeleteGroup && (
        <div className="group-delete-overlay" role="dialog" aria-modal="true" aria-labelledby="group-delete-title">
          <div className="group-delete-modal">
            <h3 id="group-delete-title">{confirmingDeleteGroup.name} 그룹을 삭제할까요?</h3>
            <p>멤버 {confirmingDeleteGroup.members.length}명도 그룹에서 함께 빠져요. 정말 삭제할까요?</p>
            <div className="group-delete-modal-actions">
              <button type="button" onClick={() => setConfirmingDeleteGroupId(null)}>아니오</button>
              <button type="button" className="danger" onClick={() => confirmDelete(confirmingDeleteGroup.id)}>
                네, 삭제할게요
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
