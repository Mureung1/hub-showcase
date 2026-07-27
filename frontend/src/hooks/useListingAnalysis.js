import { useCallback, useState } from 'react'
import { analyzeListing } from '../utils/analysisApi'
import { loadUserInfo } from '../utils/userInfoStorage'

const defaultUserInfo = {
  school: '',
  budget: '',
  commuteDaysPerWeek: '',
  returnTime: '',
  gender: '',
  hasLivingAloneExperience: '',
}

function hasListingContent(fields, ocrText) {
  return Boolean(ocrText.trim()) || Object.values(fields).some((value) => String(value).trim())
}

function hasRequiredUserInfo(userInfo) {
  return Boolean(userInfo.school && userInfo.budget && userInfo.commuteDaysPerWeek && userInfo.returnTime)
}

export function createListingAnalysisRequest({ fields, imageName, imageType, ocrText }) {
  if (!hasListingContent(fields, ocrText)) {
    return {
      error: '분석할 OCR 결과나 매물 정보를 먼저 입력해주세요.',
      request: null,
    }
  }

  const userInfo = loadUserInfo(defaultUserInfo)
  if (!hasRequiredUserInfo(userInfo)) {
    return {
      error: '사용자 정보를 먼저 저장한 뒤 AI 분석을 실행해주세요.',
      request: null,
    }
  }

  return {
    error: '',
    request: {
      userInfo,
      listingInfo: {
        fields,
        imageName,
        imageType,
        ocrText,
      },
    },
  }
}

export function useListingAnalysis() {
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const runAnalysis = useCallback(async (request) => {
    setError('')
    setAnalysis(null)

    if (!request) {
      setError('분석 요청 정보가 없습니다. 매물 업로드 화면에서 다시 시도해주세요.')
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await analyzeListing(request)
      setAnalysis(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  return {
    analysis,
    error,
    isAnalyzing,
    runAnalysis,
  }
}
