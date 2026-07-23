import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { postJson } from '@/lib/api'
import BodyMap from '@/components/BodyMap'

// 신체부위 8개 — value는 33개 운동의 involvedJoints 값과 정확히 일치해야 한다.
// "고관절"은 임상 용어라 화면 라벨에만 괄호로 "엉덩이/골반"을 병기한다.
// 순서는 목(위)부터 발목(아래)까지 신체 위치 순 — BodyMap.jsx의 zone cy값과 같은 순서다.
// group은 상체/하체 표시용 — 허리는 통증 시 주로 데드리프트(등 운동, 상체 분할)를 대체하므로 상체로 분류했다.
const BODY_PARTS = [
  { value: '목', label: '목', group: '상체' },
  { value: '어깨', label: '어깨', group: '상체' },
  { value: '허리', label: '허리', group: '상체' },
  { value: '팔꿈치', label: '팔꿈치', group: '상체' },
  { value: '손목', label: '손목', group: '상체' },
  { value: '고관절', label: '고관절(엉덩이/골반)', group: '하체' },
  { value: '무릎', label: '무릎', group: '하체' },
  { value: '발목', label: '발목', group: '하체' },
]

const UPPER_BODY_PARTS = BODY_PARTS.filter((bp) => bp.group === '상체')
const LOWER_BODY_PARTS = BODY_PARTS.filter((bp) => bp.group === '하체')

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

// 선택 표시는 텍스트 글자 "●"가 아니라 별도 div로 그린다 — 글자 방식은 폰트 metric에 따라
// 원 중앙에서 위/아래로 미세하게 밀려 보이는 문제가 있어, box 레이아웃으로 정확히 중앙에 배치한다.
function CandidateDot({ selected }) {
  return (
    <span
      className={
        'inline-flex h-5 w-5 items-center justify-center rounded-full border-2 ' +
        (selected ? 'border-accent' : 'border-border')
      }
    >
      {selected && <span className="h-2 w-2 rounded-full bg-accent" />}
    </span>
  )
}

function BodyPartGroup({ label, parts, selected, onSelect }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="font-display text-[10px] tracking-[.16em] text-text-secondary">
        {label}
      </div>
      {parts.map((bp) => (
        <button
          key={bp.value}
          onClick={() => onSelect(bp.value)}
          className={
            selected === bp.value
              ? 'rounded-pill bg-accent px-4 py-2 text-[13px] font-bold text-on-accent'
              : 'rounded-pill border border-border px-4 py-2 text-[13px] text-text hover:border-outline-hover'
          }
        >
          {bp.label}
        </button>
      ))}
    </div>
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
  const [confirmError, setConfirmError] = useState(null)

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

  const handleConfirm = async () => {
    setSubmitting(true)
    setConfirmError(null)
    const result = await postJson('/api/pain-reports/confirm', {
      routineDayId,
      originalExerciseId,
      substitutedExerciseId: selectedId,
      painBodyPart,
      isManualOverride: !isRecommendedSelected,
    })
    setSubmitting(false)
    if (!result.ok) {
      setConfirmError(result.error)
      return
    }
    setConfirmedName(selectedCandidate.name)
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

      {selectedCandidate?.imagePath && (
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-panel">
          <img
            src={selectedCandidate.imagePath}
            alt={`${selectedCandidate.name} 수행 동작`}
            className="max-h-[280px] w-full object-contain bg-bg"
          />
          <div className="px-3 py-2 text-[11px] text-text-secondary">
            출처: wger.de
            {selectedCandidate.imageLicenseAuthor &&
              ` · ${selectedCandidate.imageLicenseAuthor}`}
            {selectedCandidate.imageSourceUrl && (
              <>
                {' · '}
                <a
                  href={selectedCandidate.imageSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:text-link-hover"
                >
                  원본 보기
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {confirmedName ? (
        <span className="text-[13px] font-semibold text-success">
          ✓ {withInstrumentalParticle(confirmedName)} 반영 완료
        </span>
      ) : (
        <>
          <button
            onClick={handleConfirm}
            disabled={submitting || !selectedId}
            className="rounded-pill bg-accent px-5 py-2 text-[13px] font-bold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '반영 중...' : '이 운동으로 확정'}
          </button>
          {confirmError && (
            <p className="mt-2 text-[12px] text-text-secondary">⚠ {confirmError}</p>
          )}
        </>
      )}
    </div>
  )
}

function PainReportPage() {
  const { routineDayId } = useParams()
  const [selectedBodyPart, setSelectedBodyPart] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const handleSelectBodyPart = async (value) => {
    setSelectedBodyPart(value)
    setLoading(true)
    setReport(null)
    setLoadError(null)
    const result = await postJson('/api/pain-reports', {
      routineDayId: Number(routineDayId),
      painBodyPart: value,
    })
    setLoading(false)
    if (!result.ok) {
      setLoadError(result.error)
      return
    }
    setReport(result.data)
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg px-6 py-12">
      <div className="w-full max-w-[840px]">
        <h1 className="mb-2 text-[24px] font-extrabold text-text">
          어디가 아프신가요?
        </h1>
        <p className="mb-6 text-[14px] text-text-secondary">
          통증 부위를 선택하면 오늘 세션에서 그 부위를 쓰는 운동의 대체 후보를
          보여드려요.
        </p>

        <div className="mb-8 grid grid-cols-[300px_1fr] items-start gap-6">
          <BodyMap selected={selectedBodyPart} onSelect={handleSelectBodyPart} />
          <div className="flex flex-col gap-4">
            <div className="text-[13px] text-text-secondary">
              부위 목록에서 선택해도 돼요
            </div>
            <BodyPartGroup
              label="상체"
              parts={UPPER_BODY_PARTS}
              selected={selectedBodyPart}
              onSelect={handleSelectBodyPart}
            />
            <BodyPartGroup
              label="하체"
              parts={LOWER_BODY_PARTS}
              selected={selectedBodyPart}
              onSelect={handleSelectBodyPart}
            />
          </div>
        </div>

        {loading && <p className="text-text-secondary">확인 중...</p>}
        {loadError && <p className="text-[13px] text-text-secondary">⚠ {loadError}</p>}

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
