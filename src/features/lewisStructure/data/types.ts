export type AtomId = string

export interface LewisAtom {
  id: AtomId
  symbol: string
  x: number
  y: number
  charge?: number
}

export interface LewisBond {
  a: AtomId
  b: AtomId
  order: 1 | 2 | 3
}

export interface LewisStep {
  id: string
  title: string
  description: string
  atoms: LewisAtom[]
  bonds: LewisBond[]
  /** 이 단계에서 화면에 보이는 비공유 전자쌍 개수, 원자 id별. */
  lonePairs: Record<AtomId, number>
}

export interface LewisTemplate {
  id: string
  name: string
  formula: string
  totalValenceElectrons: number
  steps: LewisStep[]
}
