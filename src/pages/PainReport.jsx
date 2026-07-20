import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'

// 신체부위 8개 — value는 33개 운동의 involvedJoints 값과 정확히 일치해야 한다.
// "고관절"은 임상 용어라 화면 라벨에만 괄호로 "엉덩이/골반"을 병기한다.
const BODY_PARTS = [
  { value: '어깨', label: '어깨' },
  { value: '팔꿈치', label: '팔꿈치' },
  { value: '고관절', label: '고관절(엉덩이/골반)' },
  { value: '허리', label: '허리' },
  { value: '무릎', label: '무릎' },
  { value: '발목', label: '발목' },
  { value: '목', label: '목' },
  { value: '손목', label: '손목' },
]

// 이 파일은 통증 관련 문구를 buildReplacementSentence()라는 정적 템플릿으로만 만든다.
// API 응답의 어떤 필드도 자유 텍스트로 그대로 렌더링하지 않는다(의료 판단 문구 생성 금지 원칙).
function hasFinalConsonant(word) {
  const code = word.trim().at(-1)?.charCodeAt(0)
  if (!code || code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}

function withObjectParticle(word) {
  return `${word}${hasFinalConsonant(word) ? '을' : '를'}`
}

// 으로/로 조사: 받침 없거나 받침이 'ㄹ'이면 '로', 그 외 받침이면 '으로' ("컬로"가 맞고 "컬으로"는 아님).
function withInstrumentalParticle(word) {
  const code = word.trim().at(-1)?.charCodeAt(0)
  if (!code || code < 0xac00 || code > 0xd7a3) return `${word}로`
  const finalConsonantIndex = (code - 0xac00) % 28
  return finalConsonantIndex === 0 || finalConsonantIndex === 8 ? `${word}로` : `${word}으로`
}

function buildReplacementSentence({
  painBodyPart,
  originalName,
  substituteName,
  isRecommended,
}) {
  const tag = isRecommended ? '(추천)' : ''
  return `${painBodyPart} 통증으로 ${originalName} 대신 ${withObjectParticle(substituteName)} 진행합니다${tag}. 전문가 상담을 권장합니다.`
}

function CandidateDot({ selected }) {
  return selected ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-accent text-[11px] text-accent">
      ●
    </span>
  ) : (
    <span className="inline-block h-5 w-5 rounded-full border-2 border-border" />
  )
}

function ExerciseReplacementRow({ routineDayId, painBodyPart, result }) {
  const {
    originalExerciseId,
    originalName,
    needsReplacement,
    candidates,
    recommendedExerciseId,
  } = result
  const [selectedId, setSelectedId] = useState(recommendedExerciseId)
  const [confirmedName, setConfirmedName] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!needsReplacement) {
    return (
      <div className="flex items-center justify-between border-b border-border px-4 py-3 text-text-secondary">
        <span>{originalName}</span>
        <span className="text-xs">이 부위와 관련 없음</span>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="border-b border-border px-4 py-3">
        <div className="mb-1 text-text">{originalName}</div>
        <div className="text-xs text-text-secondary">
          대체 가능한 운동이 없습니다.
        </div>
      </div>
    )
  }

  const selectedCandidate = candidates.find((c) => c.id === selectedId)
  const isRecommendedSelected = selectedId === recommendedExerciseId

  const handleConfirm = () => {
    setSubmitting(true)
    fetch('/api/pain-reports/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routineDayId,
        originalExerciseId,
        substitutedExerciseId: selectedId,
        painBodyPart,
        isManualOverride: !isRecommendedSelected,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setConfirmedName(selectedCandidate.name)
        setSubmitting(false)
      })
      .catch(() => setSubmitting(false))
  }

  return (
    <div className="border-b border-border px-4 py-4">
      <div className="mb-2 text-[15px] font-semibold text-text">
        {originalName}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {candidates.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            disabled={!!confirmedName}
            className="flex items-center gap-1.5 rounded-pill border border-border px-3 py-1.5 text-[13px] text-text hover:border-outline-hover disabled:cursor-not-allowed"
          >
            <CandidateDot selected={selectedId === c.id} />
            {c.name}
            {c.id === recommendedExerciseId && (
              <span className="rounded-pill bg-accent px-1.5 py-0.5 text-[10px] font-bold text-on-accent">
                추천
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedCandidate && (
        <p className="mb-3 text-[13px] text-text-secondary">
          {buildReplacementSentence({
            painBodyPart,
            originalName,
            substituteName: selectedCandidate.name,
            isRecommended: isRecommendedSelected,
          })}
        </p>
      )}

      {confirmedName ? (
        <span className="text-[13px] font-semibold text-success">
          ✓ {withInstrumentalParticle(confirmedName)} 반영 완료
        </span>
      ) : (
        <button
          onClick={handleConfirm}
          disabled={submitting || !selectedId}
          className="rounded-pill bg-accent px-5 py-2 text-[13px] font-bold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '반영 중...' : '이 운동으로 확정'}
        </button>
      )}
    </div>
  )
}

function PainReportPage() {
  const { routineDayId } = useParams()
  const [selectedBodyPart, setSelectedBodyPart] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSelectBodyPart = (value) => {
    setSelectedBodyPart(value)
    setLoading(true)
    setReport(null)
    fetch('/api/pain-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routineDayId: Number(routineDayId),
        painBodyPart: value,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        setReport(json)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg px-6 py-12">
      <div className="w-full max-w-[640px]">
        <h1 className="mb-2 text-[24px] font-extrabold text-text">
          어디가 아프신가요?
        </h1>
        <p className="mb-6 text-[14px] text-text-secondary">
          통증 부위를 선택하면 오늘 세션에서 그 부위를 쓰는 운동의 대체 후보를
          보여드려요.
        </p>

        <div className="mb-8 flex flex-wrap gap-2">
          {BODY_PARTS.map((bp) => (
            <button
              key={bp.value}
              onClick={() => handleSelectBodyPart(bp.value)}
              className={
                selectedBodyPart === bp.value
                  ? 'rounded-pill bg-accent px-4 py-2 text-[13px] font-bold text-on-accent'
                  : 'rounded-pill border border-border px-4 py-2 text-[13px] text-text hover:border-outline-hover'
              }
            >
              {bp.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-text-secondary">확인 중...</p>}

        {report && (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {report.results.map((result) => (
              <ExerciseReplacementRow
                key={`${report.painBodyPart}-${result.originalExerciseId}`}
                routineDayId={Number(routineDayId)}
                painBodyPart={report.painBodyPart}
                result={result}
              />
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link
            to="/routine"
            className="text-[14px] text-accent hover:text-link-hover"
          >
            루틴 화면으로 돌아가서 확인하기 →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PainReportPage
