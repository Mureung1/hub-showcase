import BasicConditionStep from '../components/user-info/BasicConditionStep'
import BudgetStep from '../components/user-info/BudgetStep'
import CommuteStep from '../components/user-info/CommuteStep'
import HousingPreferenceStep from '../components/user-info/HousingPreferenceStep'
import ReviewStep from '../components/user-info/ReviewStep'
import { useUserInfoForm } from '../hooks/useUserInfoForm'

function UserInfoPage({ onComplete }) {
  const {
    currentStep,
    errors,
    form,
    goBack,
    goNext,
    progressPercent,
    saveUserInfo,
    saved,
    stepCount,
    stepIndex,
    summaryItems,
    updateField,
  } = useUserInfoForm()

  function handleSaveUserInfo() {
    const isSaved = saveUserInfo()
    if (isSaved && onComplete) {
      onComplete()
    }
  }

  return (
    <main className="user-info-page">
      <section className="user-info-shell" aria-labelledby="page-title">
        <header className="app-header">
          <p className="brand-name">집토끼</p>
          <h1 id="page-title">사용자 정보 입력</h1>
          <p className="page-description">
            처음 한 번만 입력하면 매물 분석에서 예산과 통학 환경을 함께 반영합니다.
          </p>
        </header>

        <section className="form-card" aria-labelledby="step-title">
          <div className="progress-header">
            <span className="step-count">{stepIndex + 1} / {stepCount}</span>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-value" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="step-heading">
            <h2 id="step-title">{currentStep.title}</h2>
            <p>{currentStep.description}</p>
          </div>

          {stepIndex === 0 && <BasicConditionStep errors={errors} form={form} updateField={updateField} />}
          {stepIndex === 1 && <BudgetStep errors={errors} form={form} updateField={updateField} />}
          {stepIndex === 2 && <CommuteStep errors={errors} form={form} updateField={updateField} />}
          {stepIndex === 3 && <HousingPreferenceStep form={form} updateField={updateField} />}
          {stepIndex === 4 && (
            <ReviewStep
              saved={saved}
              summaryItems={summaryItems}
            />
          )}

          <div className="button-row">
            <button className="secondary-button" type="button" onClick={goBack} disabled={stepIndex === 0}>
              이전
            </button>
            {stepIndex < stepCount - 1 ? (
              <button className="primary-button" type="button" onClick={goNext}>
                다음
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={handleSaveUserInfo}>
                매물 입력으로 이동
              </button>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}

export default UserInfoPage
