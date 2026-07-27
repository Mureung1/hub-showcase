import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import * as friendsApi from './friendsApi'
import { ROOM_FIXTURE_ICON_KEYS, SHOP_ITEM_ICON_CLASS, itemIconStyle, renderDodoMascot, renderRoomFixture } from './StaticViews'
import type { FriendHomeState, HomeVisitActionKind } from './types'

type FriendHomeViewProps = {
  friendId: string
  friendName: string
  onBack: () => void
}

export function FriendHomeView({ friendId, friendName, onBack }: FriendHomeViewProps) {
  const [notice, setNotice] = useState(`${friendName}의 방에 놀러왔어요!`)
  const [messagePanelOpen, setMessagePanelOpen] = useState(false)
  const [messageDraft, setMessageDraft] = useState('')
  const [home, setHome] = useState<FriendHomeState | null>(null)

  useEffect(() => {
    let cancelled = false
    friendsApi.fetchFriendHome(friendId)
      .then((loaded) => { if (!cancelled) setHome(loaded) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [friendId])

  const sendVisit = async (action: HomeVisitActionKind, message?: string) => {
    try {
      await friendsApi.visitFriendHome(friendId, action, message)
      setNotice(
        action === 'PAT'
          ? `${friendName}의 두두를 쓰다듬어줬어요!`
          : action === 'SNACK'
            ? `${friendName}의 두두에게 간식을 줬어요!`
            : `${friendName}에게 메시지를 남겼어요!`,
      )
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '방문 기록을 남기지 못했어요.')
    }
  }

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault()
    const message = messageDraft.trim()
    if (!message) return
    await sendVisit('MESSAGE', message)
    setMessageDraft('')
    setMessagePanelOpen(false)
  }

  return (
    <section className="myhome-view" aria-labelledby="friend-home-title">
      <div className="tab-page-heading">
        <div>
          <div className="friend-home-back">
            <button type="button" className="group-manager-back" onClick={onBack} aria-label="이전 화면으로 돌아가기">←</button>
            <span className="friend-home-back-label">돌아가기</span>
          </div>
          <span className="friend-home-kicker">VISITING</span>
          <h1 id="friend-home-title">{friendName}의 마이홈</h1>
        </div>
      </div>

      <div className="myhome-room">
        <div className="myhome-rug" aria-hidden="true" />
        <div className="myhome-message" role="status">{notice}</div>

        {renderDodoMascot(
          home?.appearance.bodyColor ?? '#f2a58d',
          home?.appearance.eyeCount ?? 2,
          home?.appearance ?? null,
          `${friendName}의 두두`,
        )}

        {home?.layout.map((entry, index) => (
          <div
            key={`${entry.itemId}-${index}`}
            className="myhome-placed-item"
            style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
            aria-hidden="true"
          >
            {ROOM_FIXTURE_ICON_KEYS.has(entry.iconKey)
              ? renderRoomFixture(entry.iconKey, entry.color)
              : <i className={SHOP_ITEM_ICON_CLASS[entry.iconKey] ?? ''} style={itemIconStyle(entry.color)} aria-hidden="true" />}
          </div>
        ))}
      </div>

      {messagePanelOpen && (
        <form className="friend-request-panel" onSubmit={submitMessage}>
          <label>
            <span>메시지</span>
            <input
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              placeholder="놀러왔어!"
              autoFocus
              maxLength={80}
            />
          </label>
          <div className="friend-request-panel-actions">
            <button type="button" onClick={() => setMessagePanelOpen(false)}>취소</button>
            <button type="submit" className="save">남기기</button>
          </div>
        </form>
      )}

      <div className="myhome-actions" aria-label={`${friendName}의 두두와 상호작용`}>
        <button type="button" onClick={() => sendVisit('PAT')}><i className="action-pat" />쓰다듬기</button>
        <button type="button" onClick={() => sendVisit('SNACK')}><i className="action-snack" />간식 주기</button>
        <button type="button" onClick={() => setMessagePanelOpen((open) => !open)}><i className="action-dress" />메시지 남기기</button>
      </div>
    </section>
  )
}
