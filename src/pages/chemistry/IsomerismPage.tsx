import { useState } from 'react'
import Structure2DViewer from '../../features/chemistry/components/Structure2DViewer'
import Structure3DViewer from '../../features/chemistry/components/Structure3DViewer'
import { ISOMER_COMPOUNDS, type IsomerCompound } from '../../features/chemistry/data/isomerCompounds'
import Panel from '../../components/Panel'
import ChapterAssistant from '../../components/ChapterAssistant'

export default function IsomerismPage() {
  const [active, setActive] = useState<IsomerCompound>(ISOMER_COMPOUNDS[0])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">무기화학 — cis/trans 이성질체·킬레이트 리간드</h1>
      <p className="mt-1 text-sm text-zinc-400">
        이 화면은{' '}
        <a href="/chemistry/inorganic/geometry" className="text-cyan-400 underline underline-offset-2">
          배위 기하구조
        </a>
        (정팔면체·평면사각형)를 안다는 전제로 이어집니다. 정사면체(tetrahedral)에는 cis/trans
        이성질체가 없습니다 — 4개 자리가 전부 동등하게 인접해 있어 "이웃"과 "반대편"의 구분 자체가
        없기 때문입니다. cis/trans는 평면사각형·정팔면체처럼 "인접"과 "반대편"이 기하학적으로
        구분되는 배위수 4·6에서만 나타납니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {ISOMER_COMPOUNDS.map((compound) => (
          <button
            key={compound.id}
            type="button"
            onClick={() => setActive(compound)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active.id === compound.id
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {compound.label}
          </button>
        ))}
      </div>

      <div className="relative mt-6 grid gap-6 sm:grid-cols-2">
        <ChapterAssistant context={`${active.label} (${active.formula}): ${active.description}`} />
        <Panel title="2D 구조식 (연결성만)">
          <Structure2DViewer smiles={active.smiles} />
          <p className="mt-2 text-xs text-zinc-500">
            2D는 어떤 리간드가 금속에 붙는지만 보여줍니다. cis/trans 배치나 킬레이트 고리 모양은
            2D로 구분할 수 없어 시스/트랜스 두 예시가 같은 그림으로 보입니다 — 아래 3D에서만
            실제 배치 차이를 확인할 수 있습니다.
          </p>
        </Panel>
        <Panel title="3D 구조 (실제 배치)">
          <Structure3DViewer sdf={active.sdf} />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="설명">
          <h2 className="text-sm font-semibold text-zinc-100">
            {active.label} ({active.formula})
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{active.description}</p>
          {active.category === 'chelate' && (
            <p className="mt-3 text-xs text-zinc-500">
              이 착이온은 거울상이성질체(Δ/Λ)도 갖는 카이랄 분자입니다 — 여기 보이는 구조는 그중
              하나이며, 리간드 수소는 기하구조를 가리지 않도록 배위 골격과 같은 이유로 생략했습니다.
            </p>
          )}
        </Panel>
      </div>
    </div>
  )
}
