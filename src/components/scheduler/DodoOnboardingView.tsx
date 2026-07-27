import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { AVATAR_PALETTE } from './shared'
import { renderDodoMascot } from './StaticViews'
import type { SelfDodoAppearance } from './types'

type DodoOnboardingViewProps = {
  appearance: SelfDodoAppearance
  onComplete: (patch: { bodyColor: string; eyeCount: 1 | 2 }) => Promise<void>
  onLogout: () => void
}

// 회원가입 직후 두두의 몸 색상·눈 개수를 고르는 1차 온보딩. 항상 현재 기본값으로 미리 채워져 있어서
// 그대로 "시작하기"를 눌러도 되고, 바꿔서 눌러도 된다 — 둘 다 제출로 취급해 온보딩을 끝낸다.
export function DodoOnboardingView({ appearance, onComplete, onLogout }: DodoOnboardingViewProps) {
  const [draftColor, setDraftColor] = useState(appearance.bodyColor)
  const [draftEyeCount, setDraftEyeCount] = useState<1 | 2>(appearance.eyeCount)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onComplete({ bodyColor: draftColor, eyeCount: draftEyeCount })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '두두를 꾸미지 못했어요. 다시 시도해주세요.')
      setSubmitting(false)
    }
  }

  return (
    <main className="scheduler-page dodo-onboarding-view">
      <div className="scheduler-content">
        <div className="tab-page-heading">
          <div><span>WELCOME</span><h1>두두를 꾸며주세요</h1></div>
        </div>

        {notice && <p className="scheduler-notice" role="status">{notice}</p>}

        <div className="myhome-room dodo-onboarding-preview">
          {renderDodoMascot(draftColor, draftEyeCount, null, '내 두두 미리보기')}
        </div>

        <form className="profile-edit-form" onSubmit={submit}>
          <div className="avatar-color-picker" role="radiogroup" aria-label="두두 몸 색상">
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
          <div className="avatar-eyes-picker" role="radiogroup" aria-label="두두 눈 개수">
            {([1, 2] as const).map((eyeCount) => (
              <button
                type="button"
                key={eyeCount}
                className={draftEyeCount === eyeCount ? 'active' : ''}
                aria-pressed={draftEyeCount === eyeCount}
                onClick={() => setDraftEyeCount(eyeCount)}
              >
                눈 {eyeCount}개
              </button>
            ))}
          </div>
          <div className="profile-edit-actions">
            <button type="submit" className="save" disabled={submitting}>시작하기</button>
          </div>
        </form>

        <button type="button" className="dodo-onboarding-logout" onClick={onLogout}>로그아웃</button>
      </div>
    </main>
  )
}
