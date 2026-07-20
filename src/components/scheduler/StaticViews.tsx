import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { FriendFeed } from './FriendFeed'
import { AVATAR_PALETTE, PixelAvatar, getAvatarProps } from './shared'
import type { FriendsManager } from './useFriendsManager'
import type { HomeManager } from './useHomeManager'
import type { ProfileManager } from './useProfileManager'
import type { FriendPost, HomeVisitActionKind } from './types'

const VISIT_ACTION_LABEL: Record<HomeVisitActionKind, string> = {
  PAT: '두두를 쓰다듬어줬어요',
  SNACK: '두두에게 간식을 줬어요',
  MESSAGE: '메시지를 남겼어요',
  PHOTO: '사진을 남겼어요',
  FURNITURE_USE: '가구를 써봤어요',
}

type MyHomeViewProps = {
  message: string
  onInteract: (message: string) => void
  homeManager: HomeManager
}

export function MyHomeView({ message, onInteract, homeManager }: MyHomeViewProps) {
  const { visits, visitsLoading, markVisitsRead } = homeManager

  useEffect(() => {
    markVisitsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="myhome-view" aria-labelledby="myhome-title">
      <div className="tab-page-heading">
        <div><span>MY LITTLE ROOM</span><h1 id="myhome-title">두두의 마이홈</h1></div>
        <div className="myhome-points"><i>✦</i><strong>120</strong><span>포인트</span></div>
      </div>

      <div className="myhome-room">
        <div className="myhome-window" aria-hidden="true"><i /><i /><i /></div>
        <div className="myhome-wall-star" aria-hidden="true" />
        <div className="myhome-shelf" aria-hidden="true"><i /><i /></div>
        <div className="myhome-rug" aria-hidden="true" />
        <div className="myhome-message" role="status">{message}</div>

        <div className="home-dodo" aria-label="마이홈에 있는 두두">
          <div className="home-dodo-body">
            <i className="home-dodo-eye left" />
            <i className="home-dodo-eye right" />
            <span className="home-dodo-cheek left" />
            <span className="home-dodo-cheek right" />
            <span className="home-dodo-mouth" />
          </div>
          <i className="home-dodo-leg left" />
          <i className="home-dodo-leg right" />
        </div>

        <div className="myhome-plant" aria-hidden="true"><i /><i /><i /></div>
      </div>

      <div className="dodo-status-card">
        <div><span>오늘의 두두</span><strong>기분이 말랑해요</strong></div>
        <div className="mood-pixels" aria-label="기분 4단계 중 3단계"><i /><i /><i /><i /></div>
      </div>

      <div className="myhome-actions" aria-label="두두와 상호작용">
        <button type="button" onClick={() => onInteract('두두가 기분 좋게 눈을 깜빡였어요!')}><i className="action-pat" />쓰다듬기</button>
        <button type="button" onClick={() => onInteract('두두가 간식을 냠냠 먹었어요.')}><i className="action-snack" />간식 주기</button>
        <button type="button" onClick={() => onInteract('새로운 옷을 고르러 가볼까요?')}><i className="action-dress" />꾸미기</button>
      </div>

      <div className="myhome-visitors" aria-labelledby="myhome-visitors-title">
        <div className="tab-page-heading">
          <div><span>VISITORS</span><h2 id="myhome-visitors-title">최근 방문자</h2></div>
        </div>
        {visitsLoading ? (
          <p className="empty-agenda">방문 기록을 불러오는 중이에요...</p>
        ) : visits.length === 0 ? (
          <p className="empty-agenda">아직 다녀간 친구가 없어요.</p>
        ) : (
          <div className="friend-list">
            {visits.map((visit) => (
              <article key={visit.id} className={visit.read ? '' : 'unread'}>
                <PixelAvatar {...getAvatarProps(visit.visitor.id)} />
                <div>
                  <strong>{visit.visitor.name}</strong>
                  <span>{VISIT_ACTION_LABEL[visit.action]}{visit.message ? ` · "${visit.message}"` : ''}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

type FriendsViewProps = {
  manager: FriendsManager
  myPosts: FriendPost[]
  onDeletePost: (postId: string) => void
  onViewFriendCalendar: (friendId: string) => void
  onVisitFriendHome: (friendId: string) => void
}

export function FriendsView({ manager, myPosts, onDeletePost, onViewFriendCalendar, onVisitFriendHome }: FriendsViewProps) {
  const [requestPanelOpen, setRequestPanelOpen] = useState(false)
  const [requestIdentifier, setRequestIdentifier] = useState('')

  const submitRequest = (event: FormEvent) => {
    event.preventDefault()
    const identifier = requestIdentifier.trim()
    if (!identifier) return
    manager.sendFriendRequest(identifier)
    setRequestIdentifier('')
  }

  return (
    <section className="friends-view" aria-labelledby="friends-title">
      <div className="friends-layout">
        <div className="friends-feed-col">
          <div className="tab-page-heading">
            <div><span>ACTIVITY</span><h2>친구 인증 피드</h2></div>
          </div>
          <FriendFeed myPosts={myPosts} onDeletePost={onDeletePost} />
        </div>

        <div className="friends-list-col">
          <div className="tab-page-heading">
            <div><span>TOGETHER</span><h1 id="friends-title">내 친구</h1></div>
            <button
              type="button"
              className="page-add-button"
              aria-label="친구 추가"
              aria-expanded={requestPanelOpen}
              onClick={() => setRequestPanelOpen((open) => !open)}
            >
              +
            </button>
          </div>

          {requestPanelOpen && (
            <form className="friend-request-panel" onSubmit={submitRequest}>
              <label>
                <span>친구 이메일 또는 아이디</span>
                <input
                  type="text"
                  value={requestIdentifier}
                  onChange={(event) => setRequestIdentifier(event.target.value)}
                  placeholder="friend@example.com 또는 dodo_day"
                  autoFocus
                />
              </label>
              <div className="friend-request-panel-actions">
                <button type="button" onClick={() => setRequestPanelOpen(false)}>취소</button>
                <button type="submit" className="save">요청 보내기</button>
              </div>
            </form>
          )}

          {manager.notice && <p className="scheduler-notice" role="status">{manager.notice}</p>}

          {manager.incomingRequests.length > 0 && (
            <div className="friend-requests-section">
              <span className="friend-requests-label">받은 요청</span>
              <div className="friend-list">
                {manager.incomingRequests.map((request) => (
                  <article key={request.id}>
                    <PixelAvatar {...getAvatarProps(request.user.id)} />
                    <div><strong>{request.user.name}</strong><span>{request.user.email}</span></div>
                    <div className="friend-request-row-actions">
                      <button type="button" onClick={() => manager.acceptRequest(request.id)}>수락</button>
                      <button type="button" onClick={() => manager.declineRequest(request.id)}>거절</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {manager.outgoingRequests.length > 0 && (
            <div className="friend-requests-section">
              <span className="friend-requests-label">보낸 요청</span>
              <div className="friend-list">
                {manager.outgoingRequests.map((request) => (
                  <article key={request.id}>
                    <PixelAvatar {...getAvatarProps(request.user.id)} />
                    <div><strong>{request.user.name}</strong><span>요청 보냄</span></div>
                    <button type="button" onClick={() => manager.cancelRequest(request.id)}>취소</button>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="friend-list">
            {manager.friendsLoading ? (
              <p className="empty-agenda">친구 목록을 불러오는 중이에요...</p>
            ) : manager.friends.length === 0 ? (
              <p className="empty-agenda">아직 친구가 없어요. + 버튼으로 친구를 추가해보세요.</p>
            ) : (
              manager.friends.map((friend) => (
                <article key={friend.id}>
                  <PixelAvatar {...getAvatarProps(friend.id)} />
                  <div><strong>{friend.name}</strong><span>{friend.email}</span></div>
                  <div className="friend-request-row-actions">
                    <button type="button" onClick={() => onViewFriendCalendar(friend.id)}>일정 보기</button>
                    <button type="button" onClick={() => onVisitFriendHome(friend.id)}>마이홈 방문</button>
                    <button type="button" onClick={() => manager.removeFriend(friend.id)}>삭제</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

type ProfileViewProps = {
  manager: ProfileManager
  onOpenGroupManager: () => void
}

export function ProfileView({ manager, onOpenGroupManager }: ProfileViewProps) {
  const { profile, loading, notice, updateProfile } = manager
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftHandle, setDraftHandle] = useState('')
  const [draftBio, setDraftBio] = useState('')
  const [draftColor, setDraftColor] = useState<string | null>(null)
  const [draftEyes, setDraftEyes] = useState<1 | 2 | null>(null)

  const startEditing = () => {
    if (!profile) return
    setDraftName(profile.name)
    setDraftHandle(profile.handle ?? '')
    setDraftBio(profile.bio ?? '')
    setDraftColor(profile.avatarColor)
    setDraftEyes(profile.avatarEyes)
    setEditing(true)
  }

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault()
    const ok = await updateProfile({
      name: draftName.trim(),
      handle: draftHandle.trim() || null,
      bio: draftBio.trim() || null,
      avatarColor: draftColor,
      avatarEyes: draftEyes,
    })
    if (ok) setEditing(false)
  }

  if (loading || !profile) {
    return (
      <section className="profile-view" aria-labelledby="profile-title">
        <div className="tab-page-heading">
          <div><span>MY PROFILE</span><h1 id="profile-title">마이</h1></div>
        </div>
        <p className="empty-agenda">프로필을 불러오는 중이에요...</p>
      </section>
    )
  }

  const avatarProps = profile.avatarColor && profile.avatarEyes
    ? { color: profile.avatarColor, eyes: profile.avatarEyes }
    : getAvatarProps(profile.id)

  return (
    <section className="profile-view" aria-labelledby="profile-title">
      <div className="tab-page-heading">
        <div><span>MY PROFILE</span><h1 id="profile-title">마이</h1></div>
        <button type="button" className="profile-settings" aria-label="프로필 설정">•••</button>
      </div>

      {notice && <p className="scheduler-notice" role="status">{notice}</p>}

      {editing ? (
        <form className="profile-edit-form" onSubmit={submitEdit}>
          <label>
            <span>이름</span>
            <input value={draftName} onChange={(event) => setDraftName(event.target.value)} required autoFocus />
          </label>
          <label>
            <span>핸들</span>
            <input value={draftHandle} onChange={(event) => setDraftHandle(event.target.value)} placeholder="dodo_day" />
          </label>
          <label>
            <span>소개</span>
            <input value={draftBio} onChange={(event) => setDraftBio(event.target.value)} maxLength={120} />
          </label>
          <div className="avatar-color-picker" role="radiogroup" aria-label="아바타 색상">
            {AVATAR_PALETTE.map((color) => (
              <button
                type="button"
                key={color}
                className={`avatar-color-swatch ${draftColor === color ? 'active' : ''}`}
                style={{ '--avatar': color } as CSSProperties}
                aria-pressed={draftColor === color}
                aria-label={color}
                onClick={() => setDraftColor(color)}
              />
            ))}
          </div>
          <div className="avatar-eyes-picker" role="radiogroup" aria-label="아바타 눈 모양">
            {([1, 2] as const).map((eyes) => (
              <button
                type="button"
                key={eyes}
                className={draftEyes === eyes ? 'active' : ''}
                aria-pressed={draftEyes === eyes}
                onClick={() => setDraftEyes(eyes)}
              >
                눈 {eyes}개
              </button>
            ))}
          </div>
          <div className="profile-edit-actions">
            <button type="button" onClick={() => setEditing(false)}>취소</button>
            <button type="submit" className="save">저장</button>
          </div>
        </form>
      ) : (
        <>
          <div className="profile-card">
            <div className="profile-avatar"><PixelAvatar {...avatarProps} /><i>{profile.stats.currentStreak}</i></div>
            <div>
              <h2>{profile.name}</h2>
              <p>{profile.handle ? `@${profile.handle}` : '핸들 미설정'}{profile.bio ? ` · ${profile.bio}` : ''}</p>
            </div>
            <button type="button" onClick={startEditing}>프로필 편집</button>
          </div>
          <div className="profile-stats">
            <article><strong>{profile.stats.currentStreak}</strong><span>연속 달성</span></article>
            <article><strong>{profile.stats.completedCount}</strong><span>완료한 일</span></article>
            <article><strong>{profile.stats.friendCount}</strong><span>친구</span></article>
          </div>
        </>
      )}

      <div className="profile-menu">
        <button type="button"><i className="profile-record" /><span><strong>나의 기록</strong><small>완료한 일정과 두두의 일기</small></span><b>›</b></button>
        <button type="button"><i className="profile-lock" /><span><strong>공개 범위</strong><small>친구별 일정 공개 설정</small></span><b>›</b></button>
        <button type="button"><i className="profile-bell" /><span><strong>알림 설정</strong><small>일정과 친구 반응 알림</small></span><b>›</b></button>
        <button type="button" onClick={onOpenGroupManager}><i className="profile-group" /><span><strong>친구 및 그룹 관리</strong><small>절친·스터디·가족 등 그룹 만들기</small></span><b>›</b></button>
      </div>
    </section>
  )
}
