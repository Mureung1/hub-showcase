import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CHALLENGE_CATEGORIES } from '../api/challenges.ts'
import { clearToken, updatePreferredCategory } from '../api/client.ts'
import Layout from '../components/Layout.tsx'
import { useCurrentUser } from '../hooks/useCurrentUser.ts'

function SettingsPage() {
  const navigate = useNavigate()
  const { user, isLoading } = useCurrentUser()
  const [notificationsOn, setNotificationsOn] = useState(true)
  const [preferredCategory, setPreferredCategory] = useState<string | null>(null)
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  useEffect(() => {
    if (user) {
      setPreferredCategory(user.preferredCategory)
    }
  }, [user])

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  async function handleSelectCategory(category: string | null) {
    setIsSavingCategory(true)

    try {
      await updatePreferredCategory(category)
      setPreferredCategory(category)
    } finally {
      setIsSavingCategory(false)
    }
  }

  return (
    <Layout title="설정">
      <section className="mb-4 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="mb-3 text-[17px] text-heading">알림</h2>
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-sm font-medium text-heading">매일 아침 알림</div>
            <p className="mt-0.5 text-xs text-muted">오전 7시, 오늘의 챌린지가 도착하면 알려드려요</p>
          </div>
          <button
            aria-pressed={notificationsOn}
            className={`relative h-6 w-[42px] flex-shrink-0 rounded-full transition-colors ${
              notificationsOn ? 'bg-accent' : 'bg-border'
            }`}
            onClick={() => setNotificationsOn((prev) => !prev)}
            type="button"
          >
            <span
              className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${
                notificationsOn ? 'left-[21px]' : 'left-[3px]'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="mb-1 text-[17px] text-heading">선호 주제</h2>
        <p className="mb-3 text-xs text-muted">고른 주제 위주로 오늘의 챌린지가 나와요. 선택 안 해도 괜찮아요.</p>
        <div className="flex flex-wrap gap-2">
          {CHALLENGE_CATEGORIES.map((category) => (
            <button
              className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold disabled:opacity-50 ${
                preferredCategory === category
                  ? 'border-accent bg-accent-bg text-accent'
                  : 'border-border text-heading'
              }`}
              disabled={isSavingCategory}
              key={category}
              onClick={() => handleSelectCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
          <button
            className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold disabled:opacity-50 ${
              preferredCategory === null ? 'border-accent bg-accent-bg text-accent' : 'border-border text-heading'
            }`}
            disabled={isSavingCategory}
            onClick={() => handleSelectCategory(null)}
            type="button"
          >
            선택 안 함
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="mb-3 text-[17px] text-heading">계정</h2>
        <div className="flex items-center justify-between border-b border-border py-3.5">
          <div className="text-sm font-medium text-heading">이메일</div>
          <div className="text-xs text-muted">{isLoading ? '불러오는 중...' : (user?.email ?? '-')}</div>
        </div>
        <button
          className="w-full py-3.5 text-left text-sm font-medium text-heading"
          onClick={handleLogout}
          type="button"
        >
          로그아웃
        </button>
      </section>
    </Layout>
  )
}

export default SettingsPage
