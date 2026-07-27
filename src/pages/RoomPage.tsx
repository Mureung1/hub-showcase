import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BASE_URL } from '../api/client.ts'
import { getRoomToday } from '../api/rooms.ts'
import type { RoomToday } from '../api/rooms.ts'
import Layout from '../components/Layout.tsx'

function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const [roomToday, setRoomToday] = useState<RoomToday | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) {
      return
    }

    getRoomToday(id)
      .then(setRoomToday)
      .catch((err) => setError(err instanceof Error ? err.message : '방 정보를 불러오지 못했습니다.'))
      .finally(() => setIsLoading(false))
  }, [id])

  async function handleCopyInviteCode() {
    if (!roomToday) {
      return
    }

    await navigator.clipboard.writeText(roomToday.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Layout title={roomToday?.roomName ?? '친구 방'}>
      <Link className="mb-2 inline-block text-sm text-muted" to="/rooms">
        ‹ 친구 방 목록
      </Link>

      {isLoading && <p className="text-sm text-muted">불러오는 중...</p>}
      {error && <p className="text-sm text-accent">{error}</p>}

      {roomToday && (
        <>
          <p className="mb-4 rounded-[10px] bg-accent-bg px-3 py-2.5 text-xs text-muted">
            오늘 완료 여부와 함께, 기록을 남긴 멤버의 사진·한 줄 메모를 볼 수 있어요. 기록 개수나 순위는 표시되지 않아요.
          </p>

          <section className="mb-4 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="mb-3 text-[17px] text-heading">오늘의 완료 현황</h2>
            <div className="divide-y divide-border">
              {roomToday.members.map((member) => (
                <div className="flex items-center justify-between gap-3 py-3" key={member.userId}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-bg text-sm font-bold text-accent">
                      {member.nickname.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-heading">{member.nickname}</div>
                      {member.recorded && member.memo && (
                        <p className="mt-0.5 max-w-[170px] truncate text-xs text-muted">{member.memo}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2.5">
                    {member.recorded && member.imageUrl && (
                      <img
                        alt={`${member.nickname}의 오늘 기록 사진`}
                        className="h-9 w-9 flex-shrink-0 rounded-[10px] object-cover"
                        src={`${BASE_URL}${member.imageUrl}`}
                      />
                    )}
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${
                        member.recorded ? 'bg-done-bg text-done' : 'bg-border text-muted'
                      }`}
                    >
                      {member.recorded ? 'O' : 'X'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="text-[17px] text-heading">초대코드</h2>
            <p className="mt-1.5 text-sm text-heading">{roomToday.inviteCode}</p>
            <button
              className="mt-3 w-full rounded-full border border-border px-4 py-3 text-[15px] font-semibold text-heading"
              onClick={handleCopyInviteCode}
              type="button"
            >
              {copied ? '복사됨!' : '초대코드 복사'}
            </button>
          </section>
        </>
      )}
    </Layout>
  )
}

export default RoomPage
