import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useRecognizeItem } from '../features/recognize/useRecognizeItem'

interface ConfirmLocationState {
  file?: File
}

export default function ConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const file = (location.state as ConfirmLocationState | null)?.file
  const hasSubmitted = useRef(false)
  const { mutate, data, isPending, isError, error } = useRecognizeItem()

  useEffect(() => {
    if (!file || hasSubmitted.current) return
    hasSubmitted.current = true
    mutate(file)
  }, [file, mutate])

  if (!file) {
    return (
      <div>
        <PageHeader title="물건 확인" backTo="/" />
        <div className="px-5 pt-[18px] pb-[90px]">
          <p className="text-sm text-sub">촬영된 사진이 없어요. 홈으로 돌아가 다시 촬영해 주세요.</p>
        </div>
      </div>
    )
  }

  const isNotFound = isError && axios.isAxiosError(error) && error.response?.status === 404

  return (
    <div>
      <PageHeader title="물건 확인" backTo="/" />
      <div className="px-5 pt-[18px] pb-[90px]">
        {isPending ? (
          <p className="mt-3 text-sm text-sub">AI가 사진을 분석하고 있어요...</p>
        ) : isNotFound ? (
          <>
            <p className="mt-3 text-sm text-sub">일치하는 품목을 찾지 못했어요. 검색으로 찾아볼까요?</p>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="mt-4 w-full rounded-md bg-green-600 py-3 text-sm font-bold text-white"
            >
              검색하러 가기
            </button>
          </>
        ) : isError ? (
          <p className="mt-3 text-sm text-sub">분석 중 오류가 발생했어요. 다시 시도해 주세요.</p>
        ) : data ? (
          <>
            <div className="font-display text-[22px] font-bold text-ink">{data.item.name}</div>
            <p className="mt-2 text-sm text-sub">이 물건이 맞나요?</p>
            <button
              type="button"
              onClick={() => navigate(`/result/${data.item.id}`)}
              className="mt-4 w-full rounded-md bg-green-600 py-3 text-sm font-bold text-white"
            >
              네, 결과 보기
            </button>
            <button type="button" onClick={() => navigate('/')} className="mt-2 w-full py-3 text-center text-sm text-sub">
              다시 촬영하기
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
