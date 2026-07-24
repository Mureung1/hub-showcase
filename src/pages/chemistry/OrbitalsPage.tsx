import { useState } from 'react'
import OrbitalCrossSection from '../../features/chemistry/components/OrbitalCrossSection'
import OrbitalDensityGraph from '../../features/chemistry/components/OrbitalDensityGraph'
import Panel from '../../components/Panel'
import ChapterAssistant from '../../components/ChapterAssistant'

type MainTab = 's' | 'p' | 'h2'
type PAxis = 'x' | 'y' | 'z'

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: 's', label: 's 오비탈' },
  { id: 'p', label: 'p 오비탈' },
  { id: 'h2', label: 'H₂ 결합 형성' },
]

const P_AXIS_TABS: { id: PAxis; label: string }[] = [
  { id: 'x', label: 'px' },
  { id: 'y', label: 'py' },
  { id: 'z', label: 'pz' },
]

const DESCRIPTIONS: Record<MainTab, { title: string; body: string }> = {
  s: {
    title: 's 오비탈 — 구형',
    body: '전자가 발견될 확률이 높은 3차원 영역(오비탈)입니다. s 오비탈은 방향에 따른 차이가 없어 정확히 구형입니다 — xy·xz·yz, 어느 단면으로 잘라도 완전히 같은 모양이 나오는 것이 바로 그 증거입니다.',
  },
  p: {
    title: 'p 오비탈 — 아령형, 핵을 지나는 마디',
    body: '핵을 지나는 지점(마디, node)에서 확률이 0이 되어 두 로브로 나뉜 아령 모양입니다. 점선으로 표시된 마디는 이 단면에서는 선으로 보이지만, 실제로는 이 축에 수직인 평면 전체입니다. px·py·pz 세 개는 서로 수직인 축을 따라 배치되며, 위 px/py/pz 버튼으로 하나씩 확인할 수 있습니다.',
  },
  h2: {
    title: 'H₂ — 파동함수 보강간섭으로 늘어나는 전자밀도',
    body: '두 수소 원자의 1s 파동함수가 같은 부호(동위상)로 겹치는 결합성 조합에서는, 단순히 두 확률밀도를 더한 것(점선, 기준선)보다 실제 밀도(실선)가 핵 사이 영역에서 더 크게 채워집니다. 색칠된 부분이 그 차이 — 파동함수의 보강간섭으로 실제로 생기는 전자밀도 증가 — 이고, 이것이 두 핵을 붙잡는 시그마(σ) 결합의 원인입니다. (위상이 반대로 겹치는 반결합 조합은 오히려 핵 사이 밀도가 줄어들며, 이 화면에서는 다루지 않습니다.)',
  },
}

export default function OrbitalsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('s')
  const [pAxis, setPAxis] = useState<PAxis>('x')

  const panelTitle =
    mainTab === 'p' ? `p 오비탈 (${P_AXIS_TABS.find((t) => t.id === pAxis)?.label})` : (MAIN_TABS.find((t) => t.id === mainTab)?.label ?? '')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">일반화학 — 오비탈 모양과 결합 형성</h1>
      <p className="mt-1 text-sm text-zinc-400">
        오비탈은 전자가 발견될 확률이 높은 영역의 모양이고, 결합은 두 원자의 오비탈이 겹쳐서
        전자 밀도가 생기는 것입니다. 이 화면은 오비탈 자체의 모양과 겹침만 다루며, 혼성 오비탈과
        분자의 결합각·기하구조는 다루지 않습니다 — 그 내용은{' '}
        <a href="/chemistry/vsepr" className="text-cyan-400 underline underline-offset-2">
          VSEPR 화면
        </a>
        에서 확인하세요.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMainTab(tab.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              mainTab === tab.id
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === 'p' && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {P_AXIS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPAxis(tab.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                pAxis === tab.id
                  ? 'border-zinc-400 bg-zinc-400/10 text-zinc-100'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative mt-6 grid gap-6 sm:grid-cols-2">
        <ChapterAssistant context={`${DESCRIPTIONS[mainTab].title}: ${DESCRIPTIONS[mainTab].body}`} />
        <Panel title={panelTitle}>
          {mainTab === 'h2' ? (
            <OrbitalDensityGraph />
          ) : (
            <OrbitalCrossSection mode={mainTab === 'p' ? (`p${pAxis}` as 'px' | 'py' | 'pz') : 's'} />
          )}
        </Panel>
        <Panel title="설명">
          <h2 className="text-sm font-semibold text-zinc-100">{DESCRIPTIONS[mainTab].title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{DESCRIPTIONS[mainTab].body}</p>
          <p className="mt-3 text-xs text-zinc-500">
            실제 오비탈은 파동함수의 확률밀도 등고면이라 계산이 복잡합니다. 이 화면은 그 모양을
            정성적으로 근사해 보여줍니다 — s는 실제로 정확히 구형이고, p는 두 로브 사이 마디가
            있다는 점만 정확히 지키면 일반화학 수준에서 표준적인 표현입니다.
          </p>
        </Panel>
      </div>
    </div>
  )
}
