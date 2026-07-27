import { describe, expect, it } from 'vitest'
import { normalizeTutorRequest } from './tutorConversation.mjs'

describe('normalizeTutorRequest', () => {
  it('trims and normalizes a valid request', () => {
    expect(
      normalizeTutorRequest({
        question: '  useState가 뭐야?  ',
        code: 'const [count, setCount] = useState(0)',
        fileName: 'Counter.jsx',
        missionTitle: ' 상태 관리 ',
        missionDetail: ' useState로 카운터 만들기 ',
        history: [
          { role: 'user', text: '  이전 질문  ' },
          { role: 'tutor', text: '이전 답변' },
        ],
      }),
    ).toEqual({
      question: 'useState가 뭐야?',
      code: 'const [count, setCount] = useState(0)',
      fileName: 'Counter.jsx',
      missionTitle: '상태 관리',
      missionDetail: 'useState로 카운터 만들기',
      history: [
        { role: 'user', text: '이전 질문' },
        { role: 'tutor', text: '이전 답변' },
      ],
    })
  })

  it('rejects an empty question', () => {
    expect(() => normalizeTutorRequest({ question: '   ' })).toThrow('Tutor question is required')
  })

  it('defaults missing optional fields and drops invalid history entries', () => {
    expect(
      normalizeTutorRequest({
        question: 'props가 뭐야?',
        history: [
          { role: 'user', text: '  ' },
          { role: 'unknown', text: '이상한 역할' },
          null,
          { role: 'tutor', text: '유효한 답변' },
        ],
      }),
    ).toEqual({
      question: 'props가 뭐야?',
      code: '',
      fileName: '',
      missionTitle: '',
      missionDetail: '',
      history: [{ role: 'tutor', text: '유효한 답변' }],
    })
  })
})
