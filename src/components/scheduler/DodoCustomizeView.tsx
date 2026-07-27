import { useState } from 'react'
import type { FormEvent } from 'react'
import { DodoAppearancePicker } from './DodoOnboardingView'
import type { SelfDodoAppearance } from './types'

type DodoCustomizeViewProps = {
  appearance: SelfDodoAppearance
  onSave: (patch: { bodyColor: string; eyeCount: 1 | 2 | 3 }) => Promise<void>
  onBack: () => void
}

// 마이페이지에서 언제든 다시 들어와 두두 몸 색상·눈 개수를 바꿀 수 있는 화면.
// 온보딩과 같은 PATCH /api/dodo/appearance를 재사용하므로, 다시 저장해도 onboardedAt은 그대로 유지된다.
export function DodoCustomizeView({ appearance, onSave, onBack }: DodoCustomizeViewProps) {
  const [draftColor, setDraftColor] = useState(appearance.bodyColor)
  const [draftEyeCount, setDraftEyeCount] = useState<1 | 2 | 3>(appearance.eyeCount)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSave({ bodyColor: draftColor, eyeCount: draftEyeCount })
      setNotice('두두를 새로 꾸몄어요!')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '두두를 꾸미지 못했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="group-manager-view" aria-labelledby="dodo-customize-title">
      <div className="tab-page-heading">
        <div>
          <button type="button" className="group-manager-back" onClick={onBack} aria-label="마이페이지로 돌아가기">←</button>
          <span>MY DODO</span>
          <h1 id="dodo-customize-title">내 두두 커스텀</h1>
        </div>
      </div>

      {notice && <p className="scheduler-notice" role="status">{notice}</p>}

      <form className="profile-edit-form" onSubmit={submit}>
        <DodoAppearancePicker color={draftColor} eyeCount={draftEyeCount} onColorChange={setDraftColor} onEyeCountChange={setDraftEyeCount} />
        <div className="profile-edit-actions">
          <button type="submit" className="save" disabled={submitting}>저장하기</button>
        </div>
      </form>
    </section>
  )
}
