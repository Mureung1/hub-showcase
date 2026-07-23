import { useState } from 'react'
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

export function useListingAnalysis({ fields, imageName, imageType, ocrText }) {
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  async function runAnalysis() {
    setError('')

    if (!hasListingContent(fields, ocrText)) {
      setError('분석할 OCR 결과나 매물 정보를 먼저 입력해주세요.')
      return
    }

    const userInfo = loadUserInfo(defaultUserInfo)
    if (!hasRequiredUserInfo(userInfo)) {
      setError('사용자 정보를 먼저 저장한 뒤 AI 분석을 실행해주세요.')
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await analyzeListing({
        userInfo,
        listingInfo: {
          fields,
          imageName,
          imageType,
          ocrText,
        },
      })

      setAnalysis(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return {
    analysis,
    error,
    isAnalyzing,
    runAnalysis,
  }
}
