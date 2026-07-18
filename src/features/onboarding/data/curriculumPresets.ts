import type { CurriculumPreset } from '../model/curriculumPresetTypes'

export const highlights = [
  '맞춤 커리큘럼 제안',
  '공식 문서 기반 설명',
  '바로 실습하는 에디터',
  '진도와 오답 관리',
] as const

export const curriculumPresets = {
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
} satisfies Record<string, CurriculumPreset>

export type CurriculumPresetKey = keyof typeof curriculumPresets
