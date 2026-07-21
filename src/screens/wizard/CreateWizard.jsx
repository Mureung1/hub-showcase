import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { PROJECT_TYPES } from '../../data/templates'
import { parseDate, toDateInputValue, addDays, diffDays } from '../../utils/dates'
import logo from '../../assets/logo.png'
import { DEMO_PROJECT_ID, toFlowProject } from '../flow/flowMock'
import FileDropzone from './FileDropzone.jsx'
import AvoidCalendar from './AvoidCalendar.jsx'
import './CreateWizard.css'

const STEPS = [
  { id: 1, label: '기본 정보' },
  { id: 2, label: '일정' },
  { id: 3, label: '팀 구성' },
]

const TOPIC_MAX = 200
const HEADCOUNT_MIN = 3
const HEADCOUNT_MAX = 8

export default function CreateWizard() {
  const navigate = useNavigate()
  const timerRef = useRef(null)

  const [step, setStep] = useState(1)
  const [phase, setPhase] = useState('form') // form | loading | done
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({
    typeHint: null,
    title: '',
    topic: '',
    file: null,
    deadline: '',
    avoidDates: [],
    headcount: 4,
  })

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const today = new Date()
  const todayStr = toDateInputValue(today)
  const minDeadline = toDateInputValue(addDays(today, 1))

  const totalDays = form.deadline ? diffDays(today, parseDate(form.deadline)) : 0
  const availableDays = totalDays - form.avoidDates.length
  const typeLabel = PROJECT_TYPES.find((t) => t.id === form.typeHint)?.label ?? '선택 안 함'

  const stepValid = {
    1: form.title.trim().length > 0 && form.topic.trim().length > 0,
    2: form.deadline !== '' && form.deadline >= minDeadline,
    3: form.headcount >= HEADCOUNT_MIN && form.headcount <= HEADCOUNT_MAX,
  }

  function patch(partial) {
    setForm((f) => ({ ...f, ...partial }))
  }

  function handleDeadlineChange(value) {
    // 마감일 변경 시 새 범위(내일~마감일 전날)를 벗어난 기피 날짜는 자동 해제
    const kept = value
      ? form.avoidDates.filter((d) => d > todayStr && d < value)
      : []
    const removed = form.avoidDates.length - kept.length
    setNotice(removed > 0 ? `마감일 변경으로 범위를 벗어난 기피 날짜 ${removed}개가 해제되었습니다.` : '')
    patch({ deadline: value, avoidDates: kept })
  }

  function toggleAvoid(dateStr) {
    setNotice('')
    patch({
      avoidDates: form.avoidDates.includes(dateStr)
        ? form.avoidDates.filter((d) => d !== dateStr)
        : [...form.avoidDates, dateStr],
    })
  }

  function handleClose() {
    const dirty =
      form.title || form.topic || form.file || form.deadline ||
      form.avoidDates.length > 0 || form.typeHint
    if (dirty && !window.confirm('작성 중인 내용이 사라집니다. 나가시겠어요?')) return
    navigate('/app/dashboard')
  }

  function handleSubmit() {
    setPhase('loading')
    // AI 플래너 연동 전 로딩 연출 — 3단계(목업)·이후 단계에서 실제 생성으로 교체
    timerRef.current = setTimeout(() => setPhase('done'), 2200)
  }

  /* ---------- 제출 이후 화면 ---------- */

  if (phase === 'loading') {
    return (
      <div className="wizard-page">
        <div className="wizard-card wizard-center">
          <span className="spinner" aria-hidden="true" />
          <h2>AI가 계획을 생성 중입니다…</h2>
          <p className="wizard-muted">주제와 일정을 분석해 역할과 마일스톤을 설계하고 있어요.</p>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="wizard-page">
        <div className="wizard-card wizard-center">
          <span className="done-icon" aria-hidden="true">✓</span>
          <h2>계획 초안이 준비되었습니다</h2>
          <p className="wizard-muted">확정 전에 역할과 일정을 검토하고 수정할 수 있어요.</p>

          <dl className="summary">
            <div><dt>제목</dt><dd>{form.title}</dd></div>
            <div><dt>과제 유형</dt><dd>{typeLabel}</dd></div>
            <div><dt>마감일</dt><dd>{form.deadline} (D-{totalDays})</dd></div>
            <div><dt>진행 가능 기간</dt><dd>{availableDays}일 (기피 {form.avoidDates.length}일)</dd></div>
            <div><dt>팀원 수</dt><dd>{form.headcount}명</dd></div>
            <div><dt>첨부</dt><dd>{form.file ? form.file.name : '없음'}</dd></div>
          </dl>

          <button
            type="button"
            className="btn btn-dark"
            onClick={() =>
              navigate(`/projects/${DEMO_PROJECT_ID}/plan`, { state: toFlowProject(form) })
            }
          >
            AI 계획 검토하기
          </button>
        </div>
      </div>
    )
  }

  /* ---------- 위저드 본문 ---------- */

  return (
    <div className="wizard-page">
      <header className="wizard-top">
        <div className="wizard-brand">
          <img src={logo} alt="" />
          <span>새 프로젝트 만들기</span>
        </div>
        <button type="button" className="wizard-close" onClick={handleClose} aria-label="닫기">✕</button>
      </header>

      <ol className="stepper">
        {STEPS.map((s) => (
          <li key={s.id} className={step === s.id ? 'current' : step > s.id ? 'passed' : ''}>
            <span className="step-num">{step > s.id ? '✓' : s.id}</span>
            {s.label}
          </li>
        ))}
      </ol>

      <div className="wizard-card">
        {step === 1 && (
          <section>
            <h2>어떤 프로젝트인가요?</h2>
            <p className="wizard-muted">과제 유형은 AI가 참고하는 힌트예요. 고르지 않아도 됩니다.</p>

            <div className="type-cards">
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`type-card${form.typeHint === t.id ? ' selected' : ''}`}
                  onClick={() => patch({ typeHint: form.typeHint === t.id ? null : t.id })}
                  aria-pressed={form.typeHint === t.id}
                >
                  <span className="type-emoji" aria-hidden="true">{t.emoji}</span>
                  <strong>{t.label}</strong>
                  <span className="type-desc">{t.description}</span>
                </button>
              ))}
            </div>

            <div className="field">
              <label htmlFor="wz-title">프로젝트 제목 <em>*</em></label>
              <input
                id="wz-title"
                className="wz-input"
                placeholder="예: 소프트웨어공학 팀 프로젝트"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </div>

            <div className="basics-grid">
              <div className="field">
                <label htmlFor="wz-topic">
                  주제 설명 <em>*</em>
                  <span className="counter">{form.topic.length}/{TOPIC_MAX}</span>
                </label>
                <textarea
                  id="wz-topic"
                  className="wz-input wz-textarea"
                  placeholder="프로젝트 주제를 짧게 설명해 주세요. AI가 역할과 태스크를 설계하는 근거가 됩니다."
                  maxLength={TOPIC_MAX}
                  value={form.topic}
                  onChange={(e) => patch({ topic: e.target.value })}
                />
              </div>

              <div className="field">
                <label>참고 자료</label>
                <FileDropzone file={form.file} onChange={(file) => patch({ file })} />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2>일정을 정해주세요</h2>
            <p className="wizard-muted">마감일을 고른 뒤, 팀이 피하고 싶은 날짜(시험·행사 등)를 캘린더에서 눌러 표시하세요.</p>

            <div className="schedule-grid">
              <div>
                <div className="field">
                  <label htmlFor="wz-deadline">마감일 <em>*</em></label>
                  <input
                    id="wz-deadline"
                    type="date"
                    className="wz-input"
                    min={minDeadline}
                    value={form.deadline}
                    onChange={(e) => handleDeadlineChange(e.target.value)}
                  />
                </div>

                {form.deadline && (
                  <div className="schedule-info">
                    <p>마감일 : <strong>{form.deadline}</strong></p>
                    <p>마감일까지 : <strong>D-{totalDays}</strong></p>
                    <p className="available">
                      프로젝트 진행 가능한 기간 : <strong>{availableDays}일</strong>
                    </p>
                    {availableDays < 7 && (
                      <p className="schedule-warn">⚠ 진행 가능한 기간이 너무 짧아요. 계획 품질이 낮아질 수 있습니다.</p>
                    )}
                  </div>
                )}
                {notice && <p className="schedule-notice">{notice}</p>}
              </div>

              <AvoidCalendar
                deadline={form.deadline}
                avoidDates={form.avoidDates}
                onToggle={toggleAvoid}
              />
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2>몇 명이 함께하나요?</h2>
            <p className="wizard-muted">본인을 포함한 팀원 수를 선택하세요. ({HEADCOUNT_MIN}~{HEADCOUNT_MAX}명)</p>

            <div className="headcount">
              <button
                type="button"
                className="count-btn"
                disabled={form.headcount <= HEADCOUNT_MIN}
                onClick={() => patch({ headcount: form.headcount - 1 })}
                aria-label="팀원 수 줄이기"
              >
                −
              </button>
              <span className="count-value">{form.headcount}<small>명</small></span>
              <button
                type="button"
                className="count-btn"
                disabled={form.headcount >= HEADCOUNT_MAX}
                onClick={() => patch({ headcount: form.headcount + 1 })}
                aria-label="팀원 수 늘리기"
              >
                ＋
              </button>
            </div>

            <p className="wizard-muted headcount-hint">
              프로젝트 생성 후 초대 링크로 팀원들을 불러올 수 있어요.
            </p>
          </section>
        )}

        <div className="wizard-actions">
          {step > 1 ? (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>이전</button>
          ) : <span />}

          {step < 3 ? (
            <button
              type="button"
              className="btn btn-dark"
              disabled={!stepValid[step]}
              onClick={() => setStep(step + 1)}
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-dark"
              disabled={!stepValid[3]}
              onClick={handleSubmit}
            >
              프로젝트 생성
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
