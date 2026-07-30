import { useMemo, useState } from 'react'
import { formatSelectedValues } from '../utils/userInfoOptions'
import { loadUserInfo, saveUserInfoToStorage } from '../utils/userInfoStorage'
import { validateUserInfoStep } from '../utils/userInfoValidation'

const steps = [
  {
    title: '기본 조건을 알려주세요',
    description: '학교와 계약 조건을 매물 분석의 기본 기준으로 사용합니다.',
  },
  {
    title: '예산 범위를 입력해주세요',
    description: '보증금, 월세, 관리비를 함께 볼 때 부담 가능한 범위를 판단합니다.',
  },
  {
    title: '통학과 이동 조건을 알려주세요',
    description: '주당 등교 횟수와 이동 조건을 바탕으로 숨은 이동 비용을 계산합니다.',
  },
  {
    title: '주거 선호를 선택해주세요',
    description: '원하는 주거 형태와 중요 조건을 분석 결과에 반영합니다.',
  },
  {
    title: '입력 내용을 확인해주세요',
    description: '완료하면 매물 스크린샷 업로드 단계로 이동합니다.',
  },
]

const defaultForm = {
  school: '',
  contractType: '',
  moveInDate: '',
  budget: '',
  maxDeposit: '',
  maxMonthlyRent: '',
  maxMaintenanceFee: '',
  useTotalBudget: false,
  commuteDaysPerWeek: '',
  returnTime: '',
  destination: '',
  maxTravelTime: '',
  transportation: [],
  housingTypes: [],
  priorities: [],
  avoidConditions: [],
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
      ['계약 유형', form.contractType || '미입력'],
      ['입주 희망 시기', form.moveInDate || '선택 안 함'],
      ['월 주거 예산', form.budget ? `${Number(form.budget).toLocaleString()}만원` : '미입력'],
      ['최대 보증금', form.maxDeposit ? `${Number(form.maxDeposit).toLocaleString()}만원` : '선택 안 함'],
      ['최대 월세', form.maxMonthlyRent ? `${Number(form.maxMonthlyRent).toLocaleString()}만원` : '선택 안 함'],
      [
        '최대 관리비',
        form.maxMaintenanceFee ? `${Number(form.maxMaintenanceFee).toLocaleString()}만원` : '선택 안 함',
      ],
      ['총액 기준', form.useTotalBudget ? '월세와 관리비 합산' : '선택 안 함'],
      ['주당 등교 횟수', form.commuteDaysPerWeek ? `${form.commuteDaysPerWeek}회` : '미입력'],
      ['주요 귀가 시간', form.returnTime || '선택 안 함'],
      ['주요 이동 목적지', form.destination || '선택 안 함'],
      ['최대 이동 시간', form.maxTravelTime ? `${Number(form.maxTravelTime).toLocaleString()}분` : '선택 안 함'],
      ['선호 교통수단', formatSelectedValues(form.transportation)],
      ['선호 주거 형태', formatSelectedValues(form.housingTypes)],
      ['중요 조건', formatSelectedValues(form.priorities)],
      ['피하고 싶은 조건', formatSelectedValues(form.avoidConditions)],
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
    let firstInvalidStep = -1
    for (let index = 0; index < steps.length; index += 1) {
      if (!validateUserInfoStep(form, index).isValid) {
        firstInvalidStep = index
        break
      }
    }

    if (firstInvalidStep >= 0) {
      setStepIndex(firstInvalidStep)
      validateStep(firstInvalidStep)
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
