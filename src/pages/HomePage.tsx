import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTodayChallenge } from '../api/challenges.ts'
import { getMe, getToken, login, resolveImageUrl, setToken } from '../api/client.ts'
import { getTodayRecord } from '../api/records.ts'
import type { RecordData } from '../api/records.ts'
import Layout from '../components/Layout.tsx'

type Challenge = {
  date: string
  topic: string
}

const GUIDE_STEPS = [
  '매일 아침 7시, 새로운 챌린지 주제가 도착해요',
  '오늘의 주제로 사진 한 장과 한 줄 메모를 남겨요',
  '캘린더에서 그동안의 기록을 모아볼 수 있어요',
  '친구 방에서 서로의 완료 여부와 기록을 나눠요',
]

function HomePage() {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [record, setRecord] = useState<RecordData | null>(null)
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)
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

  async function handleDemoLogin() {
    setDemoError(null)
    setIsDemoLoggingIn(true)

    try {
      const { token } = await login({ email: 'demo@example.com', password: 'demo1234' })
      setToken(token)

      const me = await getMe()
      window.location.href = me.onboardingCompleted ? '/' : '/onboarding'
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : '데모 로그인에 실패했습니다.')
    } finally {
      setIsDemoLoggingIn(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <Layout hideNav title="챌린지로그">
        <section className="mb-4 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="mb-2.5 inline-block rounded-full bg-accent-bg px-2.5 py-1 text-xs font-semibold text-accent">
            챌린지로그란?
          </p>
          <ol className="flex flex-col gap-3">
            {GUIDE_STEPS.map((step, index) => (
              <li className="flex items-start gap-2.5 text-sm text-muted" key={step}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-bg text-xs font-semibold text-accent">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col gap-2.5">
          <Link
            className="block w-full rounded-full bg-accent px-5 py-[13px] text-center text-[15px] font-semibold text-white"
            to="/login"
          >
            로그인
          </Link>
          <Link
            className="block w-full rounded-full border border-border px-5 py-[13px] text-center text-[15px] font-semibold text-heading"
            to="/signup"
          >
            회원가입
          </Link>
        </div>

        <p className="my-4 text-center text-xs text-muted">또는</p>

        {demoError && <p className="mb-2.5 text-center text-sm text-accent">{demoError}</p>}
        <button
          className="block w-full rounded-full border border-border px-5 py-[13px] text-center text-[15px] font-semibold text-heading disabled:opacity-50"
          disabled={isDemoLoggingIn}
          onClick={handleDemoLogin}
          type="button"
        >
          {isDemoLoggingIn ? '접속하는 중...' : '데모 계정으로 체험하기'}
        </button>
      </Layout>
    )
  }

  return (
    <Layout title="챌린지로그">
      <section className="mb-4 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <p className="mb-2.5 inline-block rounded-full bg-accent-bg px-2.5 py-1 text-xs font-semibold text-accent">
          오늘의 챌린지
        </p>
        <h2 className="text-[17px] text-heading">{challenge ? challenge.topic : '불러오는 중...'}</h2>

        {record ? (
          <img
            alt="오늘의 기록 사진"
            className="mt-3 aspect-square w-full rounded-xl object-cover"
            src={resolveImageUrl(record.imageUrl)}
          />
        ) : (
          <div className="mt-3 flex aspect-square w-full items-center justify-center rounded-xl bg-border text-xs text-muted">
            아직 오늘의 사진이 없어요
          </div>
        )}
      </section>

      {record ? (
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
      )}
    </Layout>
  )
}

export default HomePage
