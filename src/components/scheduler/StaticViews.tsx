import { friends } from './data'
import { PixelAvatar } from './shared'

type MyHomeViewProps = {
  message: string
  onInteract: (message: string) => void
}

export function MyHomeView({ message, onInteract }: MyHomeViewProps) {
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
    </section>
  )
}

export function FriendsView() {
  return (
    <section className="friends-view" aria-labelledby="friends-title">
      <div className="tab-page-heading">
        <div><span>TOGETHER</span><h1 id="friends-title">내 친구</h1></div>
        <button type="button" className="page-add-button">+</button>
      </div>
      <div className="friend-list">
        {friends.map((friend, index) => (
          <article key={friend.id}>
            <PixelAvatar color={friend.color} eyes={friend.eyes} />
            <div><strong>{friend.name}</strong><span>{index === 2 ? '스터디 멤버 4명' : `함께한 일정 ${8 - index}개`}</span></div>
            <button type="button">일정 보기</button>
          </article>
        ))}
      </div>
    </section>
  )
}

export function ProfileView() {
  return (
    <section className="profile-view" aria-labelledby="profile-title">
      <div className="tab-page-heading">
        <div><span>MY PROFILE</span><h1 id="profile-title">마이</h1></div>
        <button type="button" className="profile-settings" aria-label="프로필 설정">•••</button>
      </div>
      <div className="profile-card">
        <div className="profile-avatar"><PixelAvatar color="#f2a58d" eyes={2} /><i>7</i></div>
        <div><h2>금소현</h2><p>@dodo_day · 오늘도 하나씩 해내는 중</p></div>
        <button type="button">프로필 편집</button>
      </div>
      <div className="profile-stats">
        <article><strong>7</strong><span>연속 달성</span></article>
        <article><strong>24</strong><span>완료한 일</span></article>
        <article><strong>6</strong><span>친구</span></article>
      </div>
      <div className="profile-menu">
        <button type="button"><i className="profile-record" /><span><strong>나의 기록</strong><small>완료한 일정과 두두의 일기</small></span><b>›</b></button>
        <button type="button"><i className="profile-lock" /><span><strong>공개 범위</strong><small>친구별 일정 공개 설정</small></span><b>›</b></button>
        <button type="button"><i className="profile-bell" /><span><strong>알림 설정</strong><small>일정과 친구 반응 알림</small></span><b>›</b></button>
      </div>
    </section>
  )
}
