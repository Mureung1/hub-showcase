import { useState } from 'react'
import MoleculeInputForm, {
  type InputMode,
} from '../../features/chemistry/components/MoleculeInputForm'
import Structure2DViewer from '../../features/chemistry/components/Structure2DViewer'
import Structure3DViewer from '../../features/chemistry/components/Structure3DViewer'
import FunctionalGroupCard from '../../features/chemistry/components/FunctionalGroupCard'
import { FUNCTIONAL_GROUP_EXAMPLES } from '../../features/chemistry/data/functionalGroups'
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

export default function FunctionalGroupsPage() {
  const [showLookup, setShowLookup] = useState(false)
  const [smiles, setSmiles] = useState('CCO')
  const [sdf, setSdf] = useState<string | null>(null)
  const [info, setInfo] = useState<CompoundInfo>({ formula: null, iupacName: null })
  const [showAllCarbons, setShowAllCarbons] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <h1 className="text-2xl font-semibold text-zinc-100">일반화학 — 관능기 인식</h1>
      <p className="mt-1 text-sm text-zinc-400">
        골격구조식(탄소·수소를 생략한 그림)을 보고 관능기(작용기)를 짚어내는 연습입니다. 이 감각은
        유기화학 반응 화면(치환·제거, 알켄 첨가, 카르복시산 유도체)에서 "왜 이 자리가 반응하는가"를
        이해하는 데 그대로 이어집니다.
      </p>

      <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ChapterAssistant context="관능기 인식 연습: 골격구조식에서 알코올·에테르·알데하이드·케톤·카르복시산·에스터·아민·아마이드를 구분하는 화면" />
        {FUNCTIONAL_GROUP_EXAMPLES.map((example) => (
          <FunctionalGroupCard key={example.id} example={example} />
        ))}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowLookup((v) => !v)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
        >
          {showLookup ? '▾' : '▸'} 직접 분자 조회해보기 (학습용 아님 — 임의 분자 검색 도구)
        </button>

        {showLookup && (
          <div className="mt-3">
            <Panel title="분자 구조 조회">
              <p className="text-xs text-zinc-500">
                위 관능기 카드에 없는 임의의 분자를 SMILES나 이름으로 조회합니다. 정답이 정해진
                학습 콘텐츠가 아니라 참고용 조회 도구입니다.
              </p>
              <div className="mt-3">
                <MoleculeInputForm loading={loading} onSubmit={handleSubmit} />
              </div>

              {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
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

              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {showAllCarbons ? '2D 구조식 (탄소 표시)' : '2D 골격구조식 (탄소 생략)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllCarbons((v) => !v)}
                      className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-cyan-400 hover:text-cyan-300"
                    >
                      {showAllCarbons ? '골격식으로 보기' : '탄소 표시로 보기'}
                    </button>
                  </div>
                  <Structure2DViewer smiles={smiles} showCarbons={showAllCarbons ? 'all' : 'default'} />
                </div>
                <div>
                  <span className="mb-2 block text-xs text-zinc-500">3D 구조</span>
                  <Structure3DViewer sdf={sdf} />
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}
