import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createRoom, getMyRooms, joinRoom } from '../api/rooms.ts'
import type { Room } from '../api/rooms.ts'
import Layout from '../components/Layout.tsx'

function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none')
  const [roomName, setRoomName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function loadRooms() {
    setIsLoading(true)
    getMyRooms()
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadRooms()
  }, [])

  function resetForm() {
    setMode('none')
    setRoomName('')
    setInviteCode('')
    setError(null)
  }

  async function handleCreate() {
    if (!roomName.trim()) {
      setError('방 이름을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createRoom(roomName.trim())
      resetForm()
      loadRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : '방 생성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) {
      setError('초대코드를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await joinRoom(inviteCode.trim())
      resetForm()
      loadRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : '참여에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout title="친구 방">
      <div className="flex gap-2.5">
        <button
          className="flex-1 rounded-full bg-accent px-4 py-3 text-[15px] font-semibold text-white"
          onClick={() => setMode(mode === 'create' ? 'none' : 'create')}
          type="button"
        >
          새 방 만들기
        </button>
        <button
          className="flex-1 rounded-full border border-border px-4 py-3 text-[15px] font-semibold text-heading"
          onClick={() => setMode(mode === 'join' ? 'none' : 'join')}
          type="button"
        >
          초대코드로 참여
        </button>
      </div>

      {mode === 'create' && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <label className="mb-1.5 block text-[13px] font-semibold text-heading" htmlFor="roomName">
            방 이름
          </label>
          <input
            className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-heading"
            id="roomName"
            onChange={(e) => setRoomName(e.target.value)}
            value={roomName}
          />
          {error && <p className="mt-2 text-sm text-accent">{error}</p>}
          <button
            className="mt-3 w-full rounded-full bg-accent px-4 py-3 text-[15px] font-semibold text-white disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleCreate}
            type="button"
          >
            만들기
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <label className="mb-1.5 block text-[13px] font-semibold text-heading" htmlFor="inviteCode">
            초대코드
          </label>
          <input
            className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-heading"
            id="inviteCode"
            onChange={(e) => setInviteCode(e.target.value)}
            value={inviteCode}
          />
          {error && <p className="mt-2 text-sm text-accent">{error}</p>}
          <button
            className="mt-3 w-full rounded-full bg-accent px-4 py-3 text-[15px] font-semibold text-white disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleJoin}
            type="button"
          >
            참여하기
          </button>
        </div>
      )}

      {!isLoading && rooms.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted">아직 속한 방이 없어요. 새 방을 만들거나 초대코드로 참여해보세요.</p>
      )}

      {rooms.length > 0 && (
        <section className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {rooms.map((room) => (
            <Link
              className="flex items-center justify-between gap-3 px-[14px] py-[14px]"
              key={room.id}
              to={`/rooms/${room.id}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] bg-accent-bg text-lg text-accent">
                  {room.name.charAt(0)}
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-heading">{room.name}</div>
                  <div className="mt-0.5 text-xs text-muted">멤버 {room.memberCount}명</div>
                </div>
              </div>
              <span className="flex-shrink-0 text-lg text-muted">›</span>
            </Link>
          ))}
        </section>
      )}

      <p className="mt-4 rounded-[10px] bg-accent-bg px-3 py-2.5 text-xs text-muted">
        방을 눌러 들어가면 멤버들의 오늘 완료 여부와 기록(사진·메모), 초대코드를 볼 수 있어요.
      </p>
    </Layout>
  )
}

export default RoomsPage
