import { useEffect, useRef, useState } from 'react'

const SAVE_SUCCESS_VISIBLE_MS = 5000
const SAVE_SUCCESS_MAX_VISIBLE_MS = 8000

export default function CampusPreferenceCard({
  copy,
  preferences,
  onSelectedCampusesChange,
}) {
  const selectedCampuses = preferences?.selectedCampuses ?? []
  const [saveStatus, setSaveStatus] = useState('default')
  const successStartedAtRef = useRef(null)
  const successTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      window.clearTimeout(successTimerRef.current)
    }
  }, [])

  function scheduleSuccessReset() {
    const now = Date.now()

    if (!successStartedAtRef.current || saveStatus !== 'success') {
      successStartedAtRef.current = now
    }

    window.clearTimeout(successTimerRef.current)

    const elapsedMs = now - successStartedAtRef.current
    const remainingCapMs = Math.max(SAVE_SUCCESS_MAX_VISIBLE_MS - elapsedMs, 0)
    const nextDelayMs = Math.min(SAVE_SUCCESS_VISIBLE_MS, remainingCapMs)

    successTimerRef.current = window.setTimeout(() => {
      successStartedAtRef.current = null
      setSaveStatus('default')
    }, nextDelayMs)
  }

  function handleCampusChange(campusId, checked) {
    const nextSelectedCampuses = checked
      ? [...selectedCampuses, campusId]
      : selectedCampuses.filter((currentCampusId) => currentCampusId !== campusId)
    const saveResult = onSelectedCampusesChange(nextSelectedCampuses)

    if (saveResult?.persisted) {
      setSaveStatus('success')
      scheduleSuccessReset()
      return
    }

    window.clearTimeout(successTimerRef.current)
    successStartedAtRef.current = null
    setSaveStatus('failure')
  }

  function getSaveStatusContent() {
    if (saveStatus === 'success') {
      return (
        <>
          <strong>{copy.saveStatus.successLabel}</strong>
          <span> · </span>
          <span>{copy.saveStatus.successDetail}</span>
        </>
      )
    }

    if (saveStatus === 'failure') {
      return copy.saveStatus.failure
    }

    return copy.saveStatus.default
  }

  return (
    <section className="calendar-card">
      <div className="calendar-card-inner">
        <div className="calendar-card-heading">
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>

        <p className="calendar-card-description">{copy.description}</p>

        <fieldset className="campus-preference-group">
          <legend>{copy.groupLabel}</legend>
          <div className="campus-chip-list">
            {copy.campuses.map((campus) => {
              const isSelected = selectedCampuses.includes(campus.id)

              return (
                <label
                  key={campus.id}
                  className={`campus-chip${isSelected ? ' selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) =>
                      handleCampusChange(campus.id, event.target.checked)
                    }
                  />
                  <span className="campus-chip-mark" aria-hidden="true">
                    {isSelected ? '✓' : '□'}
                  </span>
                  <span>{campus.label}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <p className={`campus-save-status ${saveStatus}`} aria-live="polite">
          {getSaveStatusContent()}
        </p>

        <p className="campus-common-policy">{copy.commonNoticePolicy}</p>
      </div>
    </section>
  )
}
