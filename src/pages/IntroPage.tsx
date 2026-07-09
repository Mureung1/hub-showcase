import { type FormEvent, useMemo, useState } from 'react'
import { curriculumPresets, highlights, type CurriculumPresetKey } from '../data/curriculumPresets'
import type { CurriculumPreset } from '../types/learning'

function createCustomPreset(technology: string): CurriculumPreset {
  const label = technology.trim()

  return {
    label,
    goal: `${label}의 전체 그림을 잡고 작은 결과물을 직접 만드는 것`,
    fileName: `${label.replace(/\s+/g, '-') || 'learning'}-plan.txt`,
    code: `1. ${label}이 해결하는 문제 정리
2. 공식 문서의 시작 가이드 읽기
3. 가장 작은 예제 실행
4. 내 프로젝트에 적용할 미니 실습 만들기`,
    steps: [
      {
        title: '왜 필요한지 파악',
        detail: `${label}이 어떤 문제를 해결하는 기술인지 먼저 정리합니다.`,
        mission: '이 기술을 쓰려는 이유를 한 문장으로 적어보세요.',
      },
      {
        title: '핵심 개념 3개 고르기',
        detail: '공식 문서의 시작 페이지에서 반복해서 나오는 개념을 추립니다.',
        mission: '처음 볼 개념 3개를 정하고 각각 한 줄로 요약하세요.',
      },
      {
        title: '작은 예제로 검증',
        detail: '완성도보다 실행 가능한 최소 예제를 만들어 감을 잡습니다.',
        mission: '30분 안에 실행할 수 있는 가장 작은 예제를 정하세요.',
      },
    ],
  }
}

function findPreset(technology: string): CurriculumPreset {
  const normalized = technology.trim().toLowerCase()
  const matchedKey = (Object.keys(curriculumPresets) as CurriculumPresetKey[]).find((key) =>
    normalized.includes(key),
  )

  if (matchedKey) {
    return curriculumPresets[matchedKey]
  }

  return createCustomPreset(technology)
}

export default function IntroPage() {
  const [technologyInput, setTechnologyInput] = useState('React')
  const [selectedTechnology, setSelectedTechnology] = useState('React')
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const curriculum = useMemo(() => findPreset(selectedTechnology), [selectedTechnology])
  const activeStep = curriculum.steps[activeStepIndex] ?? curriculum.steps[0]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedTechnology = technologyInput.trim()

    if (!trimmedTechnology) {
      return
    }

    setSelectedTechnology(trimmedTechnology)
    setActiveStepIndex(0)
  }

  return (
    <section className="intro" aria-labelledby="project-title">
      <div className="intro__content">
        <p className="intro__eyebrow">DevChat AI Coding Tutor</p>
        <h1 id="project-title">새 기술, 어디서부터 배울지 막막할 때</h1>
        <p className="intro__description">
          DevChat은 사용자의 목표와 현재 수준을 바탕으로 오늘 배울 순서, 필요한 개념, 실습 과제를
          함께 짜주는 AI 코딩 튜터입니다. 문서 탐색부터 코드 실행, 복습까지 한 흐름으로 이어집니다.
        </p>

        <form className="curriculum-form" onSubmit={handleSubmit}>
          <label htmlFor="technology">배우고 싶은 기술</label>
          <div className="curriculum-form__row">
            <input
              id="technology"
              type="text"
              value={technologyInput}
              onChange={(event) => setTechnologyInput(event.target.value)}
              placeholder="예: React, Python, FastAPI"
            />
            <button type="submit">커리큘럼 만들기</button>
          </div>
          <p>기술명을 입력하면 오늘의 학습 순서와 첫 실습이 바뀝니다.</p>
        </form>

        <ul className="intro__highlights" aria-label="핵심 기능">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="workspace-preview" aria-label="DevChat 화면 미리보기">
        <div className="preview-chat">
          <div className="preview-message preview-message--user">
            <span>사용자</span>
            <p>{curriculum.label}를 배워야 하는데 뭐부터 해야 할지 모르겠어요.</p>
          </div>
          <div className="preview-message preview-message--ai">
            <span>AI 튜터</span>
            <p>
              목표는 {curriculum.goal}입니다. 오늘은 {activeStep.title}부터 시작해볼게요.
            </p>
          </div>
          <div className="curriculum-list" aria-label="오늘의 커리큘럼">
            {curriculum.steps.map((step, index) => (
              <button
                className={index === activeStepIndex ? 'is-active' : ''}
                key={step.title}
                type="button"
                onClick={() => setActiveStepIndex(index)}
              >
                <span>Step {index + 1}</span>
                {step.title}
              </button>
            ))}
          </div>
          <div className="preview-message preview-message--ai">
            <span>현재 단계</span>
            <p>{activeStep.detail}</p>
          </div>
        </div>

        <div className="preview-editor">
          <div className="preview-toolbar">
            <span>{curriculum.fileName}</span>
            <button type="button">실행</button>
          </div>
          <pre>{curriculum.code}</pre>
          <div className="preview-result">{activeStep.mission}</div>
        </div>
      </div>
    </section>
  )
}
