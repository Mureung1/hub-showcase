import { useMemo, useState } from 'react'
import { loadUserInfo, saveUserInfoToStorage } from '../utils/userInfoStorage'
import { validateUserInfoStep } from '../utils/userInfoValidation'

const steps = [
  {
    title: '학교를 알려주세요',
    description: '통학 시간과 주변 시세를 판단할 기준 학교로 사용합니다.',
  },
  {
    title: '월 주거 예산을 입력해주세요',
    description: '보증금, 월세, 관리비를 함께 볼 때 부담 가능한 범위를 판단합니다.',
  },
  {
    title: '통학 패턴을 알려주세요',
    description: '주당 등교 횟수와 귀가 시간을 바탕으로 숨은 이동 비용을 계산합니다.',
  },
  {
    title: '선택 정보를 확인해주세요',
    description: '선택 항목은 더 개인화된 분석에만 사용되며 입력하지 않아도 저장할 수 있습니다.',
  },
]

const defaultForm = {
  school: '',
  budget: '',
  commuteDaysPerWeek: '',
  returnTime: '',
  gender: '',
  hasLivingAloneExperience: '',
}

export function useUserInfoForm() {
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState(() => loadUserInfo(defaultForm))
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  const currentStep = steps[stepIndex]
  const progressPercent = ((stepIndex + 1) / steps.length) * 100

  const summaryItems = useMemo(
    () => [
      ['학교', form.school || '미입력'],
      ['월 주거 예산', form.budget ? `${Number(form.budget).toLocaleString()}원` : '미입력'],
      ['주당 등교 횟수', form.commuteDaysPerWeek ? `${form.commuteDaysPerWeek}회` : '미입력'],
      ['주요 귀가 시간', form.returnTime || '미입력'],
      ['성별', form.gender || '선택 안 함'],
      [
        '자취 경험',
        form.hasLivingAloneExperience === 'yes'
          ? '있음'
          : form.hasLivingAloneExperience === 'no'
            ? '없음'
            : '선택 안 함',
      ],
    ],
    [form],
  )

  function updateField(name, value) {
    setForm((prevForm) => ({ ...prevForm, [name]: value }))
    setErrors((prevErrors) => ({ ...prevErrors, [name]: '' }))
    setSaved(false)
  }

  function validateStep(index) {
    const result = validateUserInfoStep(form, index)
    setErrors(result.errors)
    return result.isValid
  }

  function goNext() {
    if (!validateStep(stepIndex)) {
      return
    }

    setStepIndex((prevStep) => Math.min(prevStep + 1, steps.length - 1))
  }

  function goBack() {
    setErrors({})
    setStepIndex((prevStep) => Math.max(prevStep - 1, 0))
  }

  function saveUserInfo() {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      return false
    }

    const data = saveUserInfoToStorage(form)
    setForm({ ...defaultForm, ...data })
    setSaved(true)
    return true
  }

  return {
    currentStep,
    errors,
    form,
    goBack,
    goNext,
    progressPercent,
    saveUserInfo,
    saved,
    stepCount: steps.length,
    stepIndex,
    summaryItems,
    updateField,
  }
}
