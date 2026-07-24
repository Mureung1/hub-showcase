import { useState } from 'react'
import { COORDINATION_COMPOUNDS } from '../../features/chemistry/data/coordinationCompounds'
import CrystalFieldDiagram from '../../features/chemistry/components/CrystalFieldDiagram'
import Panel from '../../components/Panel'
import ChapterAssistant from '../../components/ChapterAssistant'

const MAX_DELTA_WAVENUMBER_CM1 = Math.max(...COORDINATION_COMPOUNDS.map((c) => c.deltaWavenumber_cm1))

export default function CrystalFieldPage() {
  const [compoundId, setCompoundId] = useState(COORDINATION_COMPOUNDS[0].id)
  const compound =
    COORDINATION_COMPOUNDS.find((c) => c.id === compoundId) ?? COORDINATION_COMPOUNDS[0]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">무기화학 — 결정장 이론</h1>
      <p className="mt-1 text-sm text-zinc-400">
        같은 배위 화합물이라도 색이 다른 이유를 알아봅니다. 리간드가 만드는 전기장이 중심 금속의
        d 오비탈을 에너지 그룹으로 갈라놓고, 그 차이(Δ)만큼의 빛을 흡수한 뒤 남은 빛이 우리 눈에
        보이는 색입니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {COORDINATION_COMPOUNDS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCompoundId(c.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              compoundId === c.id
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="relative mt-6">
        <ChapterAssistant
          context={`${compound.label} (${compound.formula}): 결정장 갈라짐 ${compound.dOrbitalGroups.join('-')}, Δ=${compound.deltaWavenumber_cm1}cm⁻¹, 흡수 파장 ${compound.absorptionBand.peakNm}nm, 실제 색 ${compound.observedColor.label}`}
        />
        <Panel title={`${compound.label} — 왜 색을 띠는가`}>
          <CrystalFieldDiagram
            dOrbitalGroups={compound.dOrbitalGroups}
            observedColor={compound.observedColor}
            deltaWavenumber_cm1={compound.deltaWavenumber_cm1}
            maxDeltaWavenumber_cm1={MAX_DELTA_WAVENUMBER_CM1}
            absorptionBand={compound.absorptionBand}
          />
          {compound.splitNote && <p className="mt-3 text-xs text-zinc-500">{compound.splitNote}</p>}
          {compound.deltaSourceNote && (
            <p className="mt-2 flex gap-1.5 text-xs text-amber-500/90">
              <span aria-hidden="true">⚠</span>
              <span>{compound.deltaSourceNote}</span>
            </p>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="설명">
          <h2 className="text-sm font-semibold text-zinc-100">결정장 이론</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            배위 화합물의 기하구조(정팔면체, 평면사각형 등)에 따라 리간드가 만드는 전기장이
            중심 금속의 d 오비탈에 서로 다른 영향을 줘서, d 오비탈이 몇 개의 에너지 그룹으로
            갈라집니다. 이 그룹 사이의 에너지 차이(Δ)와 정확히 같은 파장의 빛을 흡수하고, 나머지
            파장의 빛이 반사·투과되어 우리 눈에 보이는 색(보색)이 됩니다.
          </p>
        </Panel>
      </div>
    </div>
  )
}
