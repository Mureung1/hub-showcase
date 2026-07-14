import { HelpCircle, Scale, Link2, PenLine, type LucideIcon } from 'lucide-react'

// DB의 mission_records.mission_type check 제약과 같은 값이어야 한다.
export type MissionType = 'question' | 'rebuttal' | 'connection' | 'expression'

export type Mission = {
  type: MissionType
  label: string
  prompt: string
  color: string
  icon: LucideIcon
}

export const MISSIONS: Mission[] = [
  {
    type: 'question',
    label: '질문',
    prompt: '이 글의 핵심 주장은 뭐지?',
    color: 'var(--hl-question)',
    icon: HelpCircle,
  },
  {
    type: 'rebuttal',
    label: '반박',
    prompt: '이 주장에 반대한다면?',
    color: 'var(--hl-rebut)',
    icon: Scale,
  },
  {
    type: 'connection',
    label: '연결',
    prompt: '내 상황이나 프로젝트와 연결해보면?',
    color: 'var(--hl-connect)',
    icon: Link2,
  },
  {
    type: 'expression',
    label: '표현',
    prompt: '이 글이 놓친 관점은 뭐지?',
    color: 'var(--hl-express)',
    icon: PenLine,
  },
]

export function pickRandomMission(): Mission {
  return MISSIONS[Math.floor(Math.random() * MISSIONS.length)]
}

export function pickRandomSentence(sentences: string[]): string {
  return sentences[Math.floor(Math.random() * sentences.length)]
}
