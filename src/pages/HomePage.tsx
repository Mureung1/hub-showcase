import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTodayChallenge } from '../api/challenges.ts'
import { getToken } from '../api/client.ts'
import { getTodayRecord } from '../api/records.ts'

type Challenge = {
  date: string
  topic: string
}

function HomePage() {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [recorded, setRecorded] = useState<boolean | null>(null)
  const isLoggedIn = Boolean(getToken())

  useEffect(() => {
    getTodayChallenge()
      .then(setChallenge)
      .catch(() => setChallenge(null))

    if (isLoggedIn) {
      getTodayRecord()
        .then((res) => setRecorded(res.recorded))
        .catch(() => setRecorded(null))
    }
  }, [isLoggedIn])

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">오늘의 챌린지</p>
      <h1 className="mt-2 text-2xl">{challenge ? challenge.topic : '불러오는 중...'}</h1>

      {isLoggedIn ? (
        recorded ? (
          <p className="mt-6 rounded-lg bg-done-bg px-4 py-3 text-sm text-done">오늘 기록을 완료했어요</p>
        ) : (
          <Link className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-white" to="/record">
            기록하기
          </Link>
        )
      ) : (
        <p className="mt-6 text-sm text-muted">로그인하면 오늘의 기록을 남길 수 있어요.</p>
      )}
    </main>
  )
}

export default HomePage
