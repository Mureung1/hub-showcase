import { useState } from 'react'
import OrbitalViewer, { type OrbitalMode } from '../../features/chemistry/components/OrbitalViewer'
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
    body: '전자가 발견될 확률이 높은 3차원 영역(오비탈)입니다. s 오비탈은 방향에 따른 차이가 없어 정확히 구형이고, 핵(중심의 흰 점)을 중심으로 사방으로 고르게 퍼져 있습니다.',
  },
  p: {
    title: 'p 오비탈 — 아령형, 핵을 지나는 마디',
    body: '핵을 지나는 지점(마디, node)에서 확률이 0이 되어 두 로브로 나뉜 아령 모양입니다. px·py·pz 세 개는 서로 수직인 축을 따라 배치됩니다 — 한 번에 하나씩 보면서(위 px/py/pz 버튼) 로브 사이 마디를 확인하고, 나머지 두 축은 가는 기준선으로만 표시해 수직 관계를 참고하세요.',
  },
  h2: {
    title: 'H₂ — 오비탈이 겹쳐 결합이 생김',
    body: '두 수소 원자의 1s 오비탈이 겹치면 그 사이(가운데 렌즈 모양 영역)에 전자 밀도가 높아지고, 이 겹친 부분이 두 핵을 붙잡아 시그마(σ) 결합을 만듭니다. 겹치는 영역이 반투명 구 두 개가 포개진 것만으로 더 짙게 보이는 것도 이 때문입니다.',
  },
}

export default function OrbitalsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('s')
  const [pAxis, setPAxis] = useState<PAxis>('x')

  const mode: OrbitalMode = mainTab === 'p' ? (`p${pAxis}` as OrbitalMode) : mainTab
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
          <OrbitalViewer mode={mode} />
          <p className="mt-2 text-xs text-zinc-500">마우스로 드래그해 돌려보세요.</p>
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
