import { useMemo, useState } from 'react'

const highlights = [
  '맞춤 커리큘럼 제안',
  '공식 문서 기반 설명',
  '바로 실습하는 에디터',
  '진도와 오답 관리',
]

const curriculumPresets = {
  react: {
    label: 'React',
    goal: '컴포넌트로 화면을 나누고 상태 변화까지 다루는 것',
    fileName: 'Counter.jsx',
    code: `import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  )
}`,
    steps: [
      {
        title: '컴포넌트 구조 이해',
        detail: '화면을 재사용 가능한 함수 단위로 나누는 방법을 배웁니다.',
        mission: '버튼 컴포넌트를 만들고 텍스트를 props로 전달해보세요.',
      },
      {
        title: 'props와 state 구분',
        detail: '부모가 내려주는 값과 컴포넌트 내부에서 바뀌는 값을 구분합니다.',
        mission: '카운터 숫자를 state로 만들고 화면에 표시해보세요.',
      },
      {
        title: '이벤트로 화면 갱신',
        detail: '클릭 이벤트를 연결해 사용자의 행동에 반응하는 UI를 만듭니다.',
        mission: '버튼을 누를 때마다 count가 1씩 증가하게 만드세요.',
      },
    ],
  },
  python: {
    label: 'Python',
    goal: '기본 문법을 익히고 작은 함수를 직접 작성하는 것',
    fileName: 'filter_even.py',
    code: `def filter_even(numbers):
    return [number for number in numbers if number % 2 == 0]

print(filter_even([1, 2, 3, 4]))`,
    steps: [
      {
        title: '자료형과 변수',
        detail: '숫자, 문자열, 리스트를 변수에 담고 출력하는 법을 익힙니다.',
        mission: '이름과 오늘 배울 주제를 변수로 저장해 출력해보세요.',
      },
      {
        title: '조건문과 반복문',
        detail: '조건에 따라 코드를 나누고 리스트를 순회하는 흐름을 배웁니다.',
        mission: '숫자 리스트에서 짝수만 출력하는 반복문을 작성하세요.',
      },
      {
        title: '함수로 문제 해결',
        detail: '반복되는 로직을 함수로 묶고 입력과 반환값을 설계합니다.',
        mission: 'filter_even 함수를 완성하고 테스트 입력으로 검증하세요.',
      },
    ],
  },
  javascript: {
    label: 'JavaScript',
    goal: '웹 화면의 데이터를 다루고 이벤트를 처리하는 것',
    fileName: 'todo.js',
    code: `const todos = ['문서 읽기', '예제 실행하기']

const completed = todos.map((todo) => ({
  title: todo,
  done: false,
}))

console.log(completed)`,
    steps: [
      {
        title: '값과 함수',
        detail: 'let, const, 함수 선언을 통해 기본 실행 흐름을 익힙니다.',
        mission: '학습할 기술명을 받아 문장으로 반환하는 함수를 만드세요.',
      },
      {
        title: '배열과 객체',
        detail: '목록 데이터를 배열과 객체로 표현하고 변환합니다.',
        mission: '학습 할 일 목록을 객체 배열로 바꿔보세요.',
      },
      {
        title: '이벤트 사고방식',
        detail: '사용자 행동이 데이터 변경과 화면 갱신으로 이어지는 구조를 이해합니다.',
        mission: '버튼 클릭 시 할 일 상태가 바뀌는 흐름을 설계해보세요.',
      },
    ],
  },
  fastapi: {
    label: 'FastAPI',
    goal: '간단한 API 엔드포인트를 만들고 요청/응답 구조를 이해하는 것',
    fileName: 'main.py',
    code: `from fastapi import FastAPI

app = FastAPI()

@app.get('/lessons/{topic}')
def read_lesson(topic: str):
    return {'topic': topic, 'status': 'ready'}`,
    steps: [
      {
        title: 'API 기본 구조',
        detail: '서버, 라우트, 요청, 응답의 역할을 먼저 정리합니다.',
        mission: 'GET 요청을 받는 가장 작은 엔드포인트를 만들어보세요.',
      },
      {
        title: '경로 파라미터',
        detail: 'URL에 포함된 값을 함수 인자로 받아 응답에 활용합니다.',
        mission: '학습 주제를 URL로 받아 JSON으로 반환하세요.',
      },
      {
        title: '데이터 검증',
        detail: '요청 데이터의 타입과 구조를 명확히 정의하는 이유를 배웁니다.',
        mission: '간단한 요청 모델을 만들고 잘못된 입력을 막아보세요.',
      },
    ],
  },
}

function findPreset(technology) {
  const normalized = technology.trim().toLowerCase()  //앞뒤 공백 제거
  const matchedKey = Object.keys(curriculumPresets).find((key) => //기술 목록이 존재하는지 검색
    normalized.includes(key), // react 기초 입력시 react 있으면 그 프리셋을 그대로 사용함
  )

  if (matchedKey) {
    return curriculumPresets[matchedKey] // 일치하는 기술 있으면 반환
  }

  const label = technology.trim() //mock 데이터에 없으면 기존 구조에 맞춰 범용 커리큘럼 생성

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

export default function ProjectIntro() {
  // 초기 값은 react
  const [technologyInput, setTechnologyInput] = useState('React')
  const [selectedTechnology, setSelectedTechnology] = useState('React')
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const curriculum = useMemo(
    () => findPreset(selectedTechnology), //selectedTechnology가 바뀔때마다 새 커리큘럼을 만듦
    [selectedTechnology],
  )
  const activeStep = curriculum.steps[activeStepIndex] ?? curriculum.steps[0]

  function handleSubmit(event) {
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
          DevChat은 사용자의 목표와 현재 수준을 바탕으로 오늘 배울 순서, 필요한 개념,
          실습 과제를 함께 짜주는 AI 코딩 튜터입니다. 문서 탐색부터 코드 실행, 복습까지
          한 흐름으로 이어집니다.
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
              목표는 {curriculum.goal}입니다. 오늘은 {activeStep.title}부터
              시작해볼게요.
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
