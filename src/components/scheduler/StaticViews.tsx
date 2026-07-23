import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { FriendFeed } from './FriendFeed'
import { AVATAR_PALETTE, PixelAvatar, getAvatarProps } from './shared'
import type { FriendsManager } from './useFriendsManager'
import type { DodoManager } from './useDodoManager'
import type { HomeManager } from './useHomeManager'
import type { ProfileManager } from './useProfileManager'
import { FOOD_ICON_KEYS, type RoomShopManager } from './useRoomShopManager'
import type { FriendPost, HomeVisitActionKind } from './types'

const SHOP_ITEM_ICON_CLASS: Record<string, string> = {
  'game-console': 'shop-item-console',
  'pillow': 'shop-item-pillow',
  'headphones': 'shop-item-headphones',
  'table': 'shop-item-table',
  'fried-egg': 'shop-item-fried-egg',
  'toast': 'shop-item-toast',
  'pancake': 'shop-item-pancake',
  'rice': 'shop-item-rice',
}

// 원래 마이홈 방에 고정 붙박이로 있던 그래픽(창문·별 장식·선반 장식·화분) — 디자인은 그대로 재사용하고
// 상점/인벤토리 목록에서는 48px 프레임에 축소해서(.shop-fixture-frame-*), 마이홈에 배치하면 원래 크기로 보여준다.
const ROOM_FIXTURE_ICON_KEYS = new Set(['window', 'wall-star', 'wall-shelf', 'plant'])

function renderRoomFixture(iconKey: string, color: string | null) {
  switch (iconKey) {
    case 'window':
      return <div className="myhome-window" aria-hidden="true"><i /><i /><i /></div>
    case 'wall-star':
      return <div className="myhome-wall-star" style={itemIconStyle(color)} aria-hidden="true" />
    case 'wall-shelf':
      return <div className="myhome-shelf" aria-hidden="true"><i /><i /></div>
    case 'plant':
      return <div className="myhome-plant" aria-hidden="true"><i /><i /><i /></div>
    default:
      return null
  }
}

// 상점/인벤토리 목록용 아이콘 — 붙박이 그래픽은 프레임에 넣어 축소, 나머지는 기존 방식 그대로.
// .shop-fixture-slot(48px, 정상 레이아웃)에 넣는 .shop-fixture-frame은 position:absolute라 원본 크기(예: 화분 135px)가
// 그리드 행 높이에 영향을 주지 않는다 — absolute가 아니면 transform:scale은 시각적으로만 줄어들 뿐 레이아웃 차지 크기는 그대로라 행이 길어져 보였다.
function renderListIcon(iconKey: string, color: string | null) {
  if (ROOM_FIXTURE_ICON_KEYS.has(iconKey)) {
    return (
      <div className="shop-fixture-slot" aria-hidden="true">
        <div className={`shop-fixture-frame shop-fixture-frame-${iconKey}`}>
          {renderRoomFixture(iconKey, color)}
        </div>
      </div>
    )
  }
  return <i className={SHOP_ITEM_ICON_CLASS[iconKey] ?? ''} style={itemIconStyle(color)} aria-hidden="true" />
}

const SHOP_ITEM_INTERACT_MESSAGE: Record<string, string> = {
  'game-console': '두두가 게임기를 붙잡고 신나게 버튼을 눌러봐요!',
  'pillow': '두두가 베개에 폭 안겨서 뒹굴뒹굴해요.',
  'headphones': '두두가 헤드폰을 쓰고 리듬을 타요!',
  'plant': '두두가 화분에 물을 줬어요!',
  'fried-egg': '두두가 계란후라이를 냠냠 먹었어요!',
  'toast': '두두가 토스트를 냠냠 먹었어요!',
  'pancake': '두두가 핫케이크를 냠냠 먹었어요!',
  'rice': '두두가 밥을 냠냠 먹었어요!',
}


// 창문·별 장식·선반 장식처럼 wallMounted인 아이템은 방의 벽 영역(y 5~45%) 안에서만 옮길 수 있다.
// 서버(lib/roomLayout.ts)도 같은 범위로 한 번 더 clamp하지만, 드래그하는 동안 바로 시각적으로 막히도록 여기서도 적용한다.
const WALL_BAND = { min: 5, max: 45 }

function itemIconStyle(color: string | null): CSSProperties | undefined {
  return color ? ({ '--item-color': color } as CSSProperties) : undefined
}

const VISIT_ACTION_LABEL: Record<HomeVisitActionKind, string> = {
  PAT: '두두를 쓰다듬어줬어요',
  SNACK: '두두에게 간식을 줬어요',
  MESSAGE: '메시지를 남겼어요',
  PHOTO: '사진을 남겼어요',
  FURNITURE_USE: '가구를 써봤어요',
}

const MOOD_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: '기분이 풀죽었어요',
  2: '기분이 심심해요',
  3: '기분이 말랑해요',
  4: '기분이 신나요',
}

type MyHomeViewProps = {
  message: string
  onInteract: (message: string) => void
  homeManager: HomeManager
  dodoManager: DodoManager
  shopManager: RoomShopManager
  points: number
  onTestGrantPoints: () => void
}

export function MyHomeView({ message, onInteract, homeManager, dodoManager, shopManager, points, onTestGrantPoints }: MyHomeViewProps) {
  const { visits, visitsLoading, markVisitsRead } = homeManager
  const { refreshDodoState } = dodoManager
  const mood = dodoManager.state?.mood ?? 3
  const [shopOpen, setShopOpen] = useState(false)
  const [snackShopOpen, setSnackShopOpen] = useState(false)
  const roomRef = useRef<HTMLDivElement>(null)
  const draggingIdRef = useRef<string | null>(null)

  useEffect(() => {
    markVisitsRead()
    // 탭을 나갔다 다시 들어올 때마다 마운트되므로, 그 사이 시간이 지나 바뀐 mood·behavior(마감 임박 등)를 여기서 다시 받아온다.
    refreshDodoState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const positionFromPointer = (event: ReactPointerEvent, wallMounted: boolean) => {
    const rect = roomRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100))
    let y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
    if (wallMounted) y = Math.min(WALL_BAND.max, Math.max(WALL_BAND.min, y))
    return { x, y }
  }

  const startDrag = (inventoryId: string) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    draggingIdRef.current = inventoryId
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleRoomPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const inventoryId = draggingIdRef.current
    if (!inventoryId) return
    const wallMounted = shopManager.inventory.find((entry) => entry.id === inventoryId)?.wallMounted ?? false
    const position = positionFromPointer(event, wallMounted)
    if (position) shopManager.setLocalPosition(inventoryId, position.x, position.y)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const inventoryId = draggingIdRef.current
    if (!inventoryId) return
    draggingIdRef.current = null
    const wallMounted = shopManager.inventory.find((entry) => entry.id === inventoryId)?.wallMounted ?? false
    const position = positionFromPointer(event, wallMounted)
    if (position) shopManager.commitPosition(inventoryId, position.x, position.y)
  }

  return (
    <section className="myhome-view" aria-labelledby="myhome-title">
      <div className="tab-page-heading">
        <div><span>MY LITTLE ROOM</span><h1 id="myhome-title">두두의 마이홈</h1></div>
        <div className="myhome-points-row">
          <div className="myhome-points"><i>✦</i><strong>{points}</strong><span>포인트</span></div>
          <button
            type="button"
            className="myhome-points-test-add"
            onClick={onTestGrantPoints}
            aria-label="테스트용 포인트 50 추가"
            title="테스트용: 포인트 50 추가"
          >
            +
          </button>
        </div>
      </div>

      <div
        className="myhome-room"
        ref={roomRef}
        onPointerMove={handleRoomPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
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
          {dodoManager.appearance && Object.values(dodoManager.appearance).map((slot) => {
            if (!slot || slot.iconKey !== 'headphones') return null
            // 이어컵(타원)이 밴드보다 훨씬 아래로 늘어지므로, 밴드에 clip-path를 걸면 같은 요소의
            // ::before/::after인 이어컵까지 그 clip-path 영역에 잘려버린다 — 그래서 셋을 별도 엘리먼트로 나눈다.
            return (
              <div key={slot.itemId} className="home-dodo-headphones" style={itemIconStyle(slot.color)} aria-hidden="true">
                <i className="home-dodo-headphones-band" />
                <i className="home-dodo-headphones-strut left" />
                <i className="home-dodo-headphones-strut right" />
                <i className="home-dodo-headphones-cup left" />
                <i className="home-dodo-headphones-cup right" />
              </div>
            )
          })}
          <i className="home-dodo-leg left" />
          <i className="home-dodo-leg right" />
        </div>

        {shopManager.layout.map((entry) => {
          const item = shopManager.inventory.find((candidate) => candidate.id === entry.inventoryId)
          if (!item) return null
          return (
            <div
              key={entry.inventoryId}
              className="myhome-placed-item"
              style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
              onPointerDown={startDrag(entry.inventoryId)}
              role="button"
              tabIndex={0}
              aria-label={`${item.name} 위치 옮기기`}
            >
              {ROOM_FIXTURE_ICON_KEYS.has(item.iconKey)
                ? renderRoomFixture(item.iconKey, item.color)
                : <i className={SHOP_ITEM_ICON_CLASS[item.iconKey] ?? ''} style={itemIconStyle(item.color)} aria-hidden="true" />}
            </div>
          )
        })}
      </div>

      <div className="dodo-status-card">
        <div><span>오늘의 두두</span><strong>{MOOD_LABEL[mood]}</strong></div>
        <div className="mood-pixels" aria-label={`기분 4단계 중 ${mood}단계`}>
          {([1, 2, 3, 4] as const).map((step) => <i key={step} className={step <= mood ? 'filled' : ''} />)}
        </div>
      </div>

      <div className="myhome-actions" aria-label="두두와 상호작용">
        <button type="button" onClick={() => onInteract('두두가 기분 좋게 눈을 깜빡였어요!')}><i className="action-pat" />쓰다듬기</button>
        <button
          type="button"
          aria-expanded={snackShopOpen}
          onClick={() => { setSnackShopOpen((open) => !open); setShopOpen(false) }}
        >
          <i className="action-snack" />간식 주기
        </button>
        <button
          type="button"
          aria-expanded={shopOpen}
          onClick={() => { setShopOpen((open) => !open); setSnackShopOpen(false) }}
        >
          <i className="action-dress" />꾸미기
        </button>
      </div>

      {snackShopOpen && (
        <RoomShopPanel shopManager={shopManager} dodoManager={dodoManager} points={points} onInteract={onInteract} onlyFood />
      )}
      {shopOpen && <RoomShopPanel shopManager={shopManager} dodoManager={dodoManager} points={points} onInteract={onInteract} />}

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

type RoomShopPanelProps = {
  shopManager: RoomShopManager
  dodoManager: DodoManager
  points: number
  onInteract: (message: string) => void
  // true면 간식류만, 기본(false)이면 간식류를 뺀 나머지(가구·벽 장식 등)만 보여준다.
  onlyFood?: boolean
}

function RoomShopPanel({ shopManager, dodoManager, points, onInteract, onlyFood = false }: RoomShopPanelProps) {
  const [tab, setTab] = useState<'shop' | 'inventory'>('shop')

  return (
    <div className="room-shop-panel" aria-labelledby="room-shop-title">
      <div className="tab-page-heading">
        <div><span>{onlyFood ? 'SNACK' : 'SHOP'}</span><h2 id="room-shop-title">{onlyFood ? '간식 주기' : '마이홈 꾸미기'}</h2></div>
      </div>
      <div className="room-shop-tabs" role="tablist" aria-label={onlyFood ? '간식 메뉴' : '꾸미기 메뉴'}>
        <button type="button" role="tab" aria-selected={tab === 'shop'} className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>
          상점
        </button>
        <button type="button" role="tab" aria-selected={tab === 'inventory'} className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>
          인벤토리
        </button>
      </div>
      {shopManager.notice && <p className="scheduler-notice" role="status">{shopManager.notice}</p>}
      {tab === 'shop' ? (
        <ShopSection shopManager={shopManager} points={points} onlyFood={onlyFood} />
      ) : (
        <InventorySection shopManager={shopManager} dodoManager={dodoManager} onInteract={onInteract} onlyFood={onlyFood} />
      )}
    </div>
  )
}

function ShopSection({ shopManager, points, onlyFood }: { shopManager: RoomShopManager; points: number; onlyFood: boolean }) {
  const { catalog, catalogLoading, inventory, purchasingId, purchase } = shopManager
  // 구매 전 색을 고르는 동안만 쓰는 임시 선택값 — 인스턴스별로 인벤토리에 쌓이므로 구매 후에도 상점 목록엔 계속 남는다.
  const [pendingColor, setPendingColor] = useState<Record<string, string>>({})

  if (catalogLoading) return <p className="empty-agenda">상점 목록을 불러오는 중이에요...</p>

  const visibleCatalog = catalog.filter((item) => FOOD_ICON_KEYS.has(item.iconKey) === onlyFood)

  return (
    <div className="room-shop-list">
      {visibleCatalog.map((item) => {
        const ownedColors = inventory.filter((entry) => entry.itemId === item.id).map((entry) => entry.color)
        // repeatable 아이템(간식류)은 이미 가지고 있어도 계속 더 살 수 있어야 하니 "보유중"으로 막지 않는다.
        const isOwnedNonCustomizable = !item.repeatable && !item.colorCustomizable && ownedColors.length > 0
        const availableColors = item.colorCustomizable ? AVATAR_PALETTE.filter((color) => !ownedColors.includes(color)) : []
        const allColorsOwned = item.colorCustomizable && availableColors.length === 0
        const chosenColor = item.colorCustomizable
          ? (pendingColor[item.id] && availableColors.includes(pendingColor[item.id]) ? pendingColor[item.id] : availableColors[0])
          : undefined

        return (
          <article key={item.id} className="room-shop-item">
            {renderListIcon(item.iconKey, chosenColor ?? null)}
            <div>
              <strong>{item.name}</strong>
              <span>{isOwnedNonCustomizable ? '보유중' : allColorsOwned ? '모든 색을 가지고 있어요' : `${item.cost} 포인트`}</span>
              {item.colorCustomizable && !allColorsOwned && (
                <div className="room-shop-item-colors" role="radiogroup" aria-label={`${item.name} 색상 선택`}>
                  <span className="room-shop-item-colors-label">색상 선택</span>
                  <div className="avatar-color-picker">
                    {AVATAR_PALETTE.map((color) => {
                      const owned = ownedColors.includes(color)
                      return (
                        <button
                          type="button"
                          key={color}
                          className={`avatar-color-swatch ${chosenColor === color ? 'active' : ''}`}
                          style={{ '--avatar': color } as CSSProperties}
                          disabled={owned}
                          aria-pressed={chosenColor === color}
                          aria-label={owned ? `${color} (보유중)` : `${color} 선택`}
                          onClick={() => setPendingColor((current) => ({ ...current, [item.id]: color }))}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            {!isOwnedNonCustomizable && !allColorsOwned && (
              <button
                type="button"
                className="save"
                disabled={points < item.cost || purchasingId === item.id || (item.colorCustomizable && !chosenColor)}
                onClick={() => purchase(item.id, item.colorCustomizable ? chosenColor : undefined)}
              >
                {purchasingId === item.id ? '구매 중...' : '구매하기'}
              </button>
            )}
          </article>
        )
      })}
    </div>
  )
}

function InventorySection({
  shopManager, dodoManager, onInteract, onlyFood,
}: {
  shopManager: RoomShopManager
  dodoManager: DodoManager
  onInteract: (message: string) => void
  onlyFood: boolean
}) {
  const { inventory, inventoryLoading, layout, placeInRoom, removeFromRoom } = shopManager
  const { appearance, equip, unequip } = dodoManager

  if (inventoryLoading) return <p className="empty-agenda">인벤토리를 불러오는 중이에요...</p>

  const visibleInventory = inventory.filter((item) => FOOD_ICON_KEYS.has(item.iconKey) === onlyFood)
  if (visibleInventory.length === 0) {
    return <p className="empty-agenda">{onlyFood ? '아직 준 간식이 없어요. 상점에서 사보세요!' : '아직 가진 아이템이 없어요. 상점에서 사보세요!'}</p>
  }

  return (
    <div className="room-shop-list">
      {visibleInventory.map((item) => {
        const isPlaced = layout.some((entry) => entry.inventoryId === item.id)
        const isEquipped = item.equippable && appearance
          ? Object.values(appearance).some((slot) => slot?.itemId === item.itemId)
          : false
        return (
          <article key={item.id} className="room-shop-item">
            {renderListIcon(item.iconKey, item.color)}
            <div>
              <strong>{item.name}</strong>
              <span>보유중</span>
            </div>
            <div className="room-shop-item-actions">
              {FOOD_ICON_KEYS.has(item.iconKey) ? (
                // 간식은 "가지고 놀기"/"방에 놓기"를 따로 안 두고, 먹이기(=배치+멘트)와 치우기(=배치 해제) 하나로 합친다.
                <button
                  type="button"
                  onClick={() => {
                    if (isPlaced) {
                      removeFromRoom(item.id)
                    } else {
                      placeInRoom(item.id)
                      onInteract(SHOP_ITEM_INTERACT_MESSAGE[item.iconKey] ?? '두두가 냠냠 먹었어요!')
                    }
                  }}
                >
                  {isPlaced ? '치우기' : '먹이기'}
                </button>
              ) : (
                <>
                  {item.interactable && (
                    <button
                      type="button"
                      onClick={() => onInteract(SHOP_ITEM_INTERACT_MESSAGE[item.iconKey] ?? '두두가 좋아해요!')}
                    >
                      가지고 놀기
                    </button>
                  )}
                  {item.equippable && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isEquipped) unequip(item.id)
                        else {
                          equip(item.id)
                          onInteract(SHOP_ITEM_INTERACT_MESSAGE[item.iconKey] ?? '두두가 좋아해요!')
                        }
                      }}
                    >
                      {isEquipped ? '장착 해제하기' : '장착하기'}
                    </button>
                  )}
                  {item.placeable && (
                    <button type="button" onClick={() => (isPlaced ? removeFromRoom(item.id) : placeInRoom(item.id))}>
                      {isPlaced ? '방에서 치우기' : '방에 놓기'}
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

type FriendsViewProps = {
  manager: FriendsManager
  myPosts: FriendPost[]
  currentUserId: string
  onDeletePost: (postId: string) => void
  onViewFriendCalendar: (friendId: string) => void
  onVisitFriendHome: (friendId: string) => void
  onPointsEarned: () => void
}

export function FriendsView({ manager, myPosts, currentUserId, onDeletePost, onViewFriendCalendar, onVisitFriendHome, onPointsEarned }: FriendsViewProps) {
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
          <FriendFeed myPosts={myPosts} currentUserId={currentUserId} onDeletePost={onDeletePost} onPointsEarned={onPointsEarned} />
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
  onOpenDiary: () => void
}

export function ProfileView({ manager, onOpenGroupManager, onOpenDiary }: ProfileViewProps) {
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
            <article><strong>{profile.stats.points}</strong><span>포인트</span></article>
          </div>
        </>
      )}

      <div className="profile-menu">
        <button type="button" onClick={onOpenDiary}><i className="profile-record" /><span><strong>나의 기록</strong><small>완료한 일정과 두두의 일기</small></span><b>›</b></button>
        <button type="button"><i className="profile-lock" /><span><strong>공개 범위</strong><small>친구별 일정 공개 설정</small></span><b>›</b></button>
        <button type="button"><i className="profile-bell" /><span><strong>알림 설정</strong><small>일정과 친구 반응 알림</small></span><b>›</b></button>
        <button type="button" onClick={onOpenGroupManager}><i className="profile-group" /><span><strong>친구 및 그룹 관리</strong><small>절친·스터디·가족 등 그룹 만들기</small></span><b>›</b></button>
      </div>
    </section>
  )
}
