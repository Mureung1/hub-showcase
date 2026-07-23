import { useEffect, useState } from 'react'
import MoleculeInputForm, {
  type InputMode,
} from '../../features/chemistry/components/MoleculeInputForm'
import Structure2DViewer from '../../features/chemistry/components/Structure2DViewer'
import Structure3DViewer from '../../features/chemistry/components/Structure3DViewer'
import {
  fetchCompoundInfo,
  fetchSdf3d,
  nameToSmiles,
  smilesToCid,
  type CompoundInfo,
} from '../../features/chemistry/lib/pubchem'
import Panel from '../../components/Panel'
import ChapterAssistant from '../../components/ChapterAssistant'

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'
/** 분자식의 숫자를 아래첨자로 (C2H6O → C₂H₆O) */
function formatFormula(formula: string): string {
  return formula.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)])
}

export default function ChemistryPage() {
  const [smiles, setSmiles] = useState('CCO')
  const [sdf, setSdf] = useState<string | null>(null)
  const [info, setInfo] = useState<CompoundInfo>({ formula: null, iupacName: null })
  const [showAllCarbons, setShowAllCarbons] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 첫 로드 시 기본 분자(에탄올)의 3D도 자동으로 가져온다. 이게 없으면 sdf가
  // null인 채로 시작해 "3D 구조를 찾을 수 없습니다"라는 거짓 안내가 뜬다.
  useEffect(() => {
    let cancelled = false
    async function loadDefault() {
      const cid = await smilesToCid('CCO')
      const [sdf3d, compoundInfo] = await Promise.all([
        cid ? fetchSdf3d(cid) : Promise.resolve(null),
        cid ? fetchCompoundInfo(cid) : Promise.resolve({ formula: null, iupacName: null }),
      ])
      if (!cancelled) {
        setSdf(sdf3d)
        setInfo(compoundInfo)
      }
    }
    loadDefault()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (value: string, mode: InputMode) => {
    setLoading(true)
    setError(null)

    const resolvedSmiles = mode === 'name' ? await nameToSmiles(value) : value

    if (!resolvedSmiles) {
      setError('해당 이름의 분자를 PubChem에서 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    setSmiles(resolvedSmiles)
    setSdf(null)
    setInfo({ formula: null, iupacName: null })

    const cid = await smilesToCid(resolvedSmiles)
    const [sdf3d, compoundInfo] = await Promise.all([
      cid ? fetchSdf3d(cid) : Promise.resolve(null),
      cid ? fetchCompoundInfo(cid) : Promise.resolve({ formula: null, iupacName: null }),
    ])
    setSdf(sdf3d)
    setInfo(compoundInfo)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">분자 구조 시각화</h1>
      <p className="mt-1 text-sm text-zinc-400">
        SMILES 표기법 또는 분자 이름을 입력하면 2D 구조식과 3D 구조를 보여줍니다.
      </p>

      <div className="mt-6">
        <MoleculeInputForm loading={loading} onSubmit={handleSubmit} />
      </div>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <div>
          <span className="text-xs text-zinc-500">분자식</span>{' '}
          <span className="text-base font-semibold text-zinc-100">
            {info.formula ? formatFormula(info.formula) : '—'}
          </span>
        </div>
        {info.iupacName && (
          <div>
            <span className="text-xs text-zinc-500">이름</span>{' '}
            <span className="text-sm text-zinc-300">{info.iupacName}</span>
          </div>
        )}
        <div>
          <span className="text-xs text-zinc-500">SMILES</span>{' '}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">{smiles}</code>
        </div>
      </div>

      <div className="relative mt-6 grid gap-6 sm:grid-cols-2">
        <ChapterAssistant
          context={`분자식 ${info.formula ?? '(조회 중)'}, 이름 ${info.iupacName ?? '(미상)'}, SMILES ${smiles}`}
        />
        <Panel title={showAllCarbons ? '2D 구조식 (탄소 표시)' : '2D 골격구조식 (탄소 생략)'}>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAllCarbons((v) => !v)}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-cyan-400 hover:text-cyan-300"
            >
              {showAllCarbons ? '골격식으로 보기 (탄소 생략)' : '탄소 표시로 보기'}
            </button>
          </div>
          <Structure2DViewer smiles={smiles} showCarbons={showAllCarbons ? 'all' : 'default'} />
        </Panel>
        <Panel title="3D 구조">
          <Structure3DViewer sdf={sdf} />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="설명">
          <h2 className="text-sm font-semibold text-zinc-100">SMILES 표기법</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            분자의 원자와 결합을 짧은 문자열로 표현하는 표기법입니다. 예를 들어 에탄올은{' '}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">CCO</code>, 벤젠은{' '}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">c1ccccc1</code>로
            표현합니다. 이름으로 검색하면 PubChem에서 SMILES와 3D 구조 데이터를 가져옵니다.
          </p>
        </Panel>
      </div>
    </div>
  )
}
