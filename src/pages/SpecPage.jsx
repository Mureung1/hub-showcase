import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  EDUCATION_OPTIONS,
  MAJOR_OPTIONS,
  MINOR_MAJOR_OPTIONS,
  CERT_OPTIONS,
  FOREIGN_LANG_TEST_OPTIONS,
  OPIC_GRADE_OPTIONS,
} from '../constants/specOptions'
import { useAppState } from '../context/AppStateContext'

function formatForeignScore(test, score) {
  return test === 'OPIc' ? `${score} 등급` : `${score}점`
}

function SpecPage() {
  const navigate = useNavigate()
  const { spec, setSpec: patchSpec } = useAppState()
  // 방금 추가할 시험/점수는 목록에 반영되기 전까지 spec에 넣지 않고 폼 로컬 상태로만 들고 있는다.
  const [draftTest, setDraftTest] = useState('')
  const [draftScore, setDraftScore] = useState('')

  function toggleCertificate(cert) {
    patchSpec({
      certificates: spec.certificates.includes(cert)
        ? spec.certificates.filter((c) => c !== cert)
        : [...spec.certificates, cert],
    })
  }

  function addForeignLanguage() {
    if (!draftTest || !draftScore) return
    const score = draftTest === 'OPIc' ? draftScore : Number(draftScore)
    // 같은 시험을 다시 추가하면 새 점수로 덮어쓴다(중복 추가 방지, 점수 갱신은 허용).
    const rest = spec.foreign_languages.filter((item) => item.test !== draftTest)
    patchSpec({ foreign_languages: [...rest, { test: draftTest, score }] })
    setDraftTest('')
    setDraftScore('')
  }

  function removeForeignLanguage(test) {
    patchSpec({ foreign_languages: spec.foreign_languages.filter((item) => item.test !== test) })
  }

  function handleSubmit(event) {
    event.preventDefault()
    // 실제 데이터(spec/filters)는 이미 Context에 있으니 라우터 state로는 "방금 제출했다"는
    // 신호만 넘긴다 — ResultPage가 이 플래그로 "새로 분석 요청" vs "새로고침 시 결과 복원"을 구분한다.
    navigate('/result', { state: { fresh: true } })
  }

  return (
    <div className="screen">
      <h1>2단계 · 스펙 입력</h1>
      <p className="sub">입력한 스펙은 이전 단계에서 고른 공고들과 항목별로 대조됩니다.</p>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field">
            <span className="field-label">학력</span>
            <select
              value={spec.education}
              onChange={(e) => patchSpec({ education: e.target.value })}
            >
              {EDUCATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">경력</span>
            <div className="row">
              <select
                value={spec.isExperienced ? '경력' : '신입'}
                onChange={(e) =>
                  patchSpec({
                    isExperienced: e.target.value === '경력',
                    career_months: e.target.value === '경력' ? spec.career_months : 0,
                  })
                }
              >
                <option value="신입">신입</option>
                <option value="경력">경력</option>
              </select>
              {spec.isExperienced && (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="경력 개월 수"
                  value={spec.career_months || ''}
                  onChange={(e) =>
                    patchSpec({ career_months: Number(e.target.value.replace(/\D/g, '')) || 0 })
                  }
                />
              )}
            </div>
          </label>

          <label className="field">
            <span className="field-label">전공</span>
            <select value={spec.major} onChange={(e) => patchSpec({ major: e.target.value })}>
              {MAJOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">부전공 (선택)</span>
            <select
              value={spec.minor_major}
              onChange={(e) => patchSpec({ minor_major: e.target.value })}
            >
              <option value="">없음</option>
              {MINOR_MAJOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <div className="field field-full">
            <span className="field-label">외국어 성적 (복수 입력 가능)</span>
            {spec.foreign_languages.length > 0 && (
              <div className="chip-row" style={{ marginBottom: 10 }}>
                {spec.foreign_languages.map((item) => (
                  <span className="lang-tag" key={item.test}>
                    {item.test} {formatForeignScore(item.test, item.score)}
                    <button
                      type="button"
                      className="lang-tag-remove"
                      onClick={() => removeForeignLanguage(item.test)}
                      aria-label={`${item.test} 삭제`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="row">
              <select
                value={draftTest}
                onChange={(e) => {
                  setDraftTest(e.target.value)
                  setDraftScore('')
                }}
              >
                <option value="">시험 선택</option>
                {FOREIGN_LANG_TEST_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {draftTest === 'OPIc' ? (
                <select value={draftScore} onChange={(e) => setDraftScore(e.target.value)}>
                  <option value="">등급 선택</option>
                  {OPIC_GRADE_OPTIONS.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              ) : (
                draftTest && (
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="점수"
                    value={draftScore}
                    onChange={(e) => setDraftScore(e.target.value.replace(/\D/g, ''))}
                  />
                )
              )}
              <button
                type="button"
                className="btn-add-small"
                onClick={addForeignLanguage}
                disabled={!draftTest || !draftScore}
              >
                추가
              </button>
            </div>
            <p className="field-hint">시험/점수를 고른 뒤 "추가" 버튼을 눌러야 입력돼요.</p>
          </div>

          <div className="field field-full">
            <span className="field-label">보유 자격증/면허</span>
            <div className="chip-row">
              {CERT_OPTIONS.map((cert) => (
                <button
                  type="button"
                  key={cert}
                  className={`chip-btn${spec.certificates.includes(cert) ? ' active' : ''}`}
                  onClick={() => toggleCertificate(cert)}
                >
                  {cert}
                </button>
              ))}
            </div>
          </div>

          <label className="field field-full">
            <span className="field-label">
              컴퓨터활용능력 보유 여부 (우대 항목 · 지원가능 판정엔 영향 없음)
            </span>
            <div className="row" style={{ alignItems: 'center' }}>
              <input
                type="checkbox"
                style={{ width: 16, height: 16, flex: 'none' }}
                checked={spec.has_computer_skill}
                onChange={(e) => patchSpec({ has_computer_skill: e.target.checked })}
              />
              <span style={{ fontSize: 13 }}>보유하고 있음</span>
            </div>
          </label>
        </div>

        <div className="btn-row">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/filter')}
          >
            이전
          </button>
          <button type="submit" className="btn-primary">
            갭 분석 결과 보기
          </button>
        </div>
      </form>
    </div>
  )
}

export default SpecPage
