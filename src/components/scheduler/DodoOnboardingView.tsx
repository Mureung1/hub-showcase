import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { AVATAR_PALETTE } from './shared'
import { renderDodoMascot } from './StaticViews'
import type { SelfDodoAppearance } from './types'

type DodoAppearancePickerProps = {
  color: string
  eyeCount: 1 | 2 | 3
  onColorChange: (color: string) => void
  onEyeCountChange: (eyeCount: 1 | 2 | 3) => void
}

// 온보딩·마이페이지 커스텀 화면 둘 다에서 쓰는 두두 미리보기 + 색상/눈개수 선택 UI.
export function DodoAppearancePicker({ color, eyeCount, onColorChange, onEyeCountChange }: DodoAppearancePickerProps) {
  return (
    <>
      <div className="myhome-room dodo-onboarding-preview">
        {renderDodoMascot(color, eyeCount, null, '내 두두 미리보기')}
      </div>
      <div className="avatar-color-picker" role="radiogroup" aria-label="두두 몸 색상">
        {AVATAR_PALETTE.map((swatch) => (
          <button
            type="button"
            key={swatch}
            className={`avatar-color-swatch ${color === swatch ? 'active' : ''}`}
            style={{ '--avatar': swatch } as CSSProperties}
            aria-pressed={color === swatch}
            aria-label={swatch}
            onClick={() => onColorChange(swatch)}
          />
        ))}
      </div>
      <div className="avatar-eyes-picker" role="radiogroup" aria-label="두두 눈 개수">
        {([1, 2, 3] as const).map((count) => (
          <button
            type="button"
            key={count}
            className={eyeCount === count ? 'active' : ''}
            aria-pressed={eyeCount === count}
            onClick={() => onEyeCountChange(count)}
          >
            눈 {count}개
          </button>
        ))}
      </div>
    </>
  )
}

type DodoOnboardingViewProps = {
  appearance: SelfDodoAppearance
  onComplete: (patch: { bodyColor: string; eyeCount: 1 | 2 | 3 }) => Promise<void>
  onLogout: () => void
}

// 회원가입 직후 두두의 몸 색상·눈 개수를 고르는 1차 온보딩. 항상 현재 기본값으로 미리 채워져 있어서
// 그대로 "시작하기"를 눌러도 되고, 바꿔서 눌러도 된다 — 둘 다 제출로 취급해 온보딩을 끝낸다.
export function DodoOnboardingView({ appearance, onComplete, onLogout }: DodoOnboardingViewProps) {
  const [draftColor, setDraftColor] = useState(appearance.bodyColor)
  const [draftEyeCount, setDraftEyeCount] = useState<1 | 2 | 3>(appearance.eyeCount)
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

        <form className="profile-edit-form" onSubmit={submit}>
          <DodoAppearancePicker color={draftColor} eyeCount={draftEyeCount} onColorChange={setDraftColor} onEyeCountChange={setDraftEyeCount} />
          <div className="profile-edit-actions">
            <button type="submit" className="save" disabled={submitting}>시작하기</button>
          </div>
        </form>

        <button type="button" className="dodo-onboarding-logout" onClick={onLogout}>로그아웃</button>
      </div>
    </main>
  )
}
