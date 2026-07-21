import { useEffect, useState } from 'react'
import { VSEPR_MOLECULES, type VseprMolecule } from '../../features/chemistry/data/vseprMolecules'
import { fetchSdf3d, nameToSmiles, smilesToCid } from '../../features/chemistry/lib/pubchem'
import Structure2DViewer from '../../features/chemistry/components/Structure2DViewer'
import Structure3DViewer from '../../features/chemistry/components/Structure3DViewer'
import Panel from '../../components/Panel'
import ChapterAssistant from '../../components/ChapterAssistant'

export default function VseprPage() {
  const [activeMolecule, setActiveMolecule] = useState<VseprMolecule>(VSEPR_MOLECULES[0])
  const [smiles, setSmiles] = useState<string | null>(null)
  const [sdf, setSdf] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      const resolvedSmiles = await nameToSmiles(activeMolecule.searchName)
      if (!resolvedSmiles) {
        if (!cancelled) {
          setError('PubChem에서 분자를 찾을 수 없습니다.')
          setLoading(false)
        }
        return
      }
      if (cancelled) return
      setSmiles(resolvedSmiles)

      const cid = await smilesToCid(resolvedSmiles)
      const sdf3d = cid ? await fetchSdf3d(cid) : null
      if (!cancelled) {
        setSdf(sdf3d)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeMolecule])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">일반화학 — 분자 구조 (VSEPR)</h1>
      <p className="mt-1 text-sm text-zinc-400">
        전자쌍(결합쌍+비공유쌍) 개수가 같아도, 비공유쌍이 많을수록 서로 밀어내는 힘 때문에
        결합각이 좁아집니다. 아래 세 분자는 전자 도메인이 전부 4개지만 비공유쌍 개수만 다릅니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {VSEPR_MOLECULES.map((molecule) => (
          <button
            key={molecule.id}
            type="button"
            onClick={() => setActiveMolecule(molecule)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeMolecule.id === molecule.id
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {molecule.label} ({molecule.formula}) · 비공유쌍 {molecule.lonePairs}개
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <div className="relative mt-6 grid gap-6 sm:grid-cols-2">
        <ChapterAssistant
          context={`${activeMolecule.label} (${activeMolecule.formula}): 결합쌍 ${activeMolecule.bondingPairs}개, 비공유쌍 ${activeMolecule.lonePairs}개, ${activeMolecule.geometry}, 결합각 ${activeMolecule.approxBondAngle}`}
        />
        <Panel title="2D 구조식">
          {smiles ? (
            <Structure2DViewer smiles={smiles} />
          ) : (
            <p className="p-4 text-sm text-zinc-500">{loading ? '조회 중...' : '데이터 없음'}</p>
          )}
        </Panel>
        <Panel title="3D 구조">
          <Structure3DViewer sdf={sdf} />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="설명">
          <h2 className="text-sm font-semibold text-zinc-100">
            {activeMolecule.label} ({activeMolecule.formula}) — {activeMolecule.geometry}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            중심 원자 주위에 결합쌍 {activeMolecule.bondingPairs}개, 비공유쌍{' '}
            {activeMolecule.lonePairs}개(전자 도메인 총{' '}
            {activeMolecule.bondingPairs + activeMolecule.lonePairs}개)가 있어, 서로 최대한 멀리
            떨어지려는 전자쌍 반발에 의해 {activeMolecule.geometry} 구조를 이룹니다. 실제 결합각은{' '}
            {activeMolecule.approxBondAngle}입니다.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            메테인(109.5°) → 암모니아(107°) → 물(104.5°) 순서로 비공유쌍이 하나씩 늘어날 때마다
            결합각이 좁아지는 걸 비교해보세요 — 비공유쌍은 결합쌍보다 더 넓게 퍼져있어서 결합쌍을
            더 세게 밀어냅니다.
          </p>
        </Panel>
      </div>
    </div>
  )
}
