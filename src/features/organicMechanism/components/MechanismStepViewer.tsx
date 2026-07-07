import { useEffect, useRef, useState } from 'react'
import SmilesDrawer from 'smiles-drawer'
import type { AtomIndex, MechanismStep } from '../data/types'
import { getAtomCoords } from '../lib/atomCoords'
import ArrowOverlay from './ArrowOverlay'
import AtomIndexDebugOverlay from './AtomIndexDebugOverlay'

interface MechanismStepViewerProps {
  step: MechanismStep
  showDebugIndices?: boolean
}

const WIDTH = 460
const HEIGHT = 320

export default function MechanismStepViewer({
  step,
  showDebugIndices = false,
}: MechanismStepViewerProps) {
  // smiles-drawer's SvgDrawer wipes all children of its target <svg> on every
  // draw() call, which would rip out any React-rendered overlay nodes living
  // in the same element. So the structure is drawn into its own dedicated
  // <svg> (never given React children), and the arrow overlay is a separate
  // React-owned <svg> stacked on top, sharing the same viewBox so coordinates
  // from smiles-drawer's graph line up exactly.
  const structureSvgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState('0 0 100 100')
  const [atomCoords, setAtomCoords] = useState<Map<AtomIndex, { x: number; y: number }>>(
    new Map(),
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const svgEl = structureSvgRef.current
    if (!svgEl) return
    setError(null)
    SmilesDrawer.parse(
      step.smiles,
      (tree) => {
        try {
          const drawer = new SmilesDrawer.SvgDrawer({ width: WIDTH, height: HEIGHT })
          drawer.draw(tree, svgEl, 'dark')
          const vb = svgEl.getAttribute('viewBox')
          if (vb) setViewBox(vb)
          setAtomCoords(getAtomCoords(drawer.preprocessor.graph))
        } catch {
          setError('구조를 그리는 중 오류가 발생했습니다.')
        }
      },
      () => setError('SMILES를 해석할 수 없습니다.'),
    )
  }, [step.smiles])

  return (
    <div className="relative mx-auto" style={{ width: WIDTH, height: HEIGHT }}>
      <svg ref={structureSvgRef} width={WIDTH} height={HEIGHT} className="absolute inset-0" />
      <svg
        viewBox={viewBox}
        width={WIDTH}
        height={HEIGHT}
        className="pointer-events-none absolute inset-0"
      >
        <ArrowOverlay stepId={step.id} arrows={step.arrows} atomCoords={atomCoords} />
        {showDebugIndices && <AtomIndexDebugOverlay atomCoords={atomCoords} />}
      </svg>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  )
}
