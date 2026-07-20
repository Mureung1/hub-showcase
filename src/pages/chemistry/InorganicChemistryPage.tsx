import { useState } from 'react'
import MoleculeInputForm, {
  type InputMode,
} from '../../features/chemistry/components/MoleculeInputForm'
import Structure2DViewer from '../../features/chemistry/components/Structure2DViewer'
import Structure3DViewer from '../../features/chemistry/components/Structure3DViewer'
import { fetchSdf3d, nameToSmiles, smilesToCid } from '../../features/chemistry/lib/pubchem'
import {
  COORDINATION_COMPOUNDS,
  type CoordinationCompound,
} from '../../features/chemistry/data/coordinationCompounds'
import Panel from '../../components/Panel'
import ChapterAssistant from '../../components/ChapterAssistant'

const DEFAULT_COMPOUND = COORDINATION_COMPOUNDS[0]

export default function InorganicChemistryPage() {
  const [smiles, setSmiles] = useState(DEFAULT_COMPOUND.smiles)
  const [sdf, setSdf] = useState<string | null>(DEFAULT_COMPOUND.sdf)
  const [activeCompound, setActiveCompound] = useState<CoordinationCompound | null>(
    DEFAULT_COMPOUND,
  )
  const [presetKey, setPresetKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectPreset = (compound: CoordinationCompound) => {
    setActiveCompound(compound)
    setSmiles(compound.smiles)
    setSdf(compound.sdf)
    setError(null)
    setPresetKey((key) => key + 1)
  }

  const handleFreeSearch = async (value: string, mode: InputMode) => {
    setLoading(true)
    setError(null)
    setActiveCompound(null)

    const resolvedSmiles = mode === 'name' ? await nameToSmiles(value) : value

    if (!resolvedSmiles) {
      setError('해당 이름의 분자를 PubChem에서 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    setSmiles(resolvedSmiles)
    setSdf(null)

    const cid = await smilesToCid(resolvedSmiles)
    const sdf3d = cid ? await fetchSdf3d(cid) : null
    setSdf(sdf3d)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">무기화학 — 배위 화합물</h1>
      <p className="mt-1 text-sm text-zinc-400">
        중심 금속 이온에 리간드가 배위결합으로 둘러싸인 구조를 보여줍니다. 아래 검증된 예시는
        정팔면체·평면사각형 결합각을 직접 계산한 정확한 3D 구조이고, 자유 검색은 PubChem 데이터를
        그대로 사용합니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {COORDINATION_COMPOUNDS.map((compound) => (
          <button
            key={compound.id}
            type="button"
            onClick={() => handleSelectPreset(compound)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCompound?.id === compound.id
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {compound.label} · {compound.geometry}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <MoleculeInputForm key={presetKey} loading={loading} onSubmit={handleFreeSearch} />
        <p className="mt-2 text-xs text-zinc-500">
          자유 검색은 금속을 포함한 배위 화합물에서 정확하지 않을 수 있습니다(PubChem이
          배위결합을 분리된 조각으로 표현하거나 3D 데이터가 없는 경우가 많음). 위 예시 버튼은
          이 한계와 무관하게 정확한 구조를 보여줍니다.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <div className="relative mt-6 grid gap-6 sm:grid-cols-2">
        <ChapterAssistant
          context={
            activeCompound
              ? `${activeCompound.label} (${activeCompound.formula}): 배위수 ${activeCompound.coordinationNumber}, ${activeCompound.geometry}`
              : `현재 보고 있는 분자의 SMILES: ${smiles}`
          }
        />
        <Panel title="2D 구조식">
          <Structure2DViewer smiles={smiles} />
        </Panel>
        <Panel title="3D 구조">
          <Structure3DViewer sdf={sdf} />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="설명">
          {activeCompound ? (
            <>
              <h2 className="text-sm font-semibold text-zinc-100">
                {activeCompound.label} ({activeCompound.formula})
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {activeCompound.description}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-zinc-100">배위 화합물</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                금속 이온(중심 원자)에 리간드(전자쌍을 내주는 분자·이온)가 배위결합으로 둘러싸인
                구조입니다. 리간드 개수를 배위수라 하고, 배위수에 따라 정팔면체·평면사각형·정사면체
                등 정해진 기하구조를 이룹니다.
              </p>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
