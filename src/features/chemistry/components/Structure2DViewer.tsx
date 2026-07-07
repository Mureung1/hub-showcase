import { useEffect, useRef, useState } from 'react'
import SmilesDrawer from 'smiles-drawer'

interface Structure2DViewerProps {
  smiles: string
}

const WIDTH = 380
const HEIGHT = 300

export default function Structure2DViewer({ smiles }: Structure2DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!smiles || !canvasRef.current) return
    setError(null)
    const canvas = canvasRef.current
    const drawer = new SmilesDrawer.Drawer({ width: WIDTH, height: HEIGHT })
    SmilesDrawer.parse(
      smiles,
      (tree) => {
        drawer.draw(tree, canvas, 'dark', false)
      },
      () => setError('SMILES를 해석할 수 없습니다.'),
    )
  }, [smiles])

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
