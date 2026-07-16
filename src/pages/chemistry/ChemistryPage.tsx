import { useState } from 'react'
import MoleculeInputForm, {
  type InputMode,
} from '../../features/chemistry/components/MoleculeInputForm'
import Structure2DViewer from '../../features/chemistry/components/Structure2DViewer'
import Structure3DViewer from '../../features/chemistry/components/Structure3DViewer'
import { fetchSdf3d, nameToSmiles, smilesToCid } from '../../features/chemistry/lib/pubchem'
import Panel from '../../components/Panel'
import ChapterAssistant from '../../components/ChapterAssistant'

export default function ChemistryPage() {
  const [smiles, setSmiles] = useState('CCO')
  const [sdf, setSdf] = useState<string | null>(null)
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

    const cid = await smilesToCid(resolvedSmiles)
    const sdf3d = cid ? await fetchSdf3d(cid) : null
    setSdf(sdf3d)
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

      <div className="relative mt-6 grid gap-6 sm:grid-cols-2">
        <ChapterAssistant context={`현재 보고 있는 분자의 SMILES: ${smiles}`} />
        <Panel title="2D 골격구조식">
          <Structure2DViewer smiles={smiles} />
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
