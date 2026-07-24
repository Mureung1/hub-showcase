import { useEffect, useRef, useState } from 'react'
import SmilesDrawer from 'smiles-drawer'

interface Structure2DViewerProps {
  smiles: string
  /** 'default'=골격식(탄소 생략), 'all'=모든 탄소 명시. 초보 배려용 토글 */
  showCarbons?: 'default' | 'all'
  /** SMILES 원자맵(예: [OH:1])의 class 번호를 색으로 강조 표시 — [classNumber, color] 쌍 배열 */
  highlightAtoms?: [number, string][]
}

const WIDTH = 380
const HEIGHT = 300

export default function Structure2DViewer({
  smiles,
  showCarbons = 'default',
  highlightAtoms = [],
}: Structure2DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!smiles || !canvasRef.current) return
    setError(null)
    const canvas = canvasRef.current
    const drawer = new SmilesDrawer.Drawer({ width: WIDTH, height: HEIGHT, showCarbons })
    SmilesDrawer.parse(
      smiles,
      (tree) => {
        drawer.draw(tree, canvas, 'dark', false, highlightAtoms)
      },
      () => setError('SMILES를 해석할 수 없습니다.'),
    )
  }, [smiles, showCarbons, highlightAtoms])

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="rounded-lg bg-zinc-950"
      />
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  )
}
