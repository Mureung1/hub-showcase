import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTodayChallenge } from '../api/challenges.ts'
import { BASE_URL, getToken } from '../api/client.ts'
import { getTodayRecord } from '../api/records.ts'
import type { RecordData } from '../api/records.ts'
import Layout from '../components/Layout.tsx'

type Challenge = {
  date: string
  topic: string
}

function HomePage() {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [record, setRecord] = useState<RecordData | null>(null)
  const isLoggedIn = Boolean(getToken())

  useEffect(() => {
    if (!isLoggedIn) {
      return
    }

    getTodayChallenge()
      .then(setChallenge)
      .catch(() => setChallenge(null))

    getTodayRecord()
      .then((res) => setRecord(res.record))
      .catch(() => setRecord(null))
  }, [isLoggedIn])

  return (
    <Layout title="챌린지로그">
      <section className="mb-4 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <p className="mb-2.5 inline-block rounded-full bg-accent-bg px-2.5 py-1 text-xs font-semibold text-accent">
          오늘의 챌린지
        </p>
        <h2 className="text-[17px] text-heading">
          {isLoggedIn ? (challenge ? challenge.topic : '불러오는 중...') : '로그인하면 볼 수 있어요'}
        </h2>

        {isLoggedIn &&
          (record ? (
            <img
              alt="오늘의 기록 사진"
              className="mt-3 aspect-square w-full rounded-xl object-cover"
              src={`${BASE_URL}${record.imageUrl}`}
            />
          ) : (
            <div className="mt-3 flex aspect-square w-full items-center justify-center rounded-xl bg-border text-xs text-muted">
              아직 오늘의 사진이 없어요
            </div>
          ))}
      </section>

      {isLoggedIn ? (
        record ? (
          <p className="rounded-2xl bg-done-bg px-[18px] py-3 text-center text-sm text-done">
            오늘 기록을 완료했어요
          </p>
        ) : (
          <Link
            className="block w-full rounded-full bg-accent px-5 py-[13px] text-center text-[15px] font-semibold text-white"
            to="/record"
          >
            오늘 기록 남기기
          </Link>
        )
      ) : (
        <p className="rounded-[10px] bg-accent-bg px-3 py-2.5 text-xs text-muted">
          로그인하면 오늘의 기록을 남길 수 있어요.
        </p>
      )}
    </Layout>
  )
}

export default HomePage
