import { useEffect, useRef, useState } from 'react'
import SmilesDrawer from 'smiles-drawer'
import type { AtomIndex, MechanismStep } from '../data/types'
import { getAtomCoords } from '../lib/atomCoords'
import ArrowOverlay from './ArrowOverlay'
import AtomIndexDebugOverlay from './AtomIndexDebugOverlay'

interface MechanismStepViewerProps {
  step: MechanismStep
  /** 이 단계에서 지금까지 드러낼 화살표 개수(순차 표시용). 미지정 시 전체 표시. */
  visibleArrowCount?: number
  showDebugIndices?: boolean
}

const WIDTH = 460
const HEIGHT = 320

export default function MechanismStepViewer({
  step,
  visibleArrowCount,
  showDebugIndices = false,
}: MechanismStepViewerProps) {
  const visibleArrows =
    visibleArrowCount === undefined ? step.arrows : step.arrows.slice(0, visibleArrowCount)
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
          // showCarbons: 'all' — 메커니즘 분자는 탄소 1~3개로 작고, 반응 중심 탄소가
          // 골격식에선 글자 없는 빈 꼭짓점으로 그려져 "탄소를 공격" 설명과 화면이
          // 어긋난다(실사용 피드백). 여기선 골격식을 가르치는 게 목적이 아니라 반응을
          // 보여주는 게 목적이라 모든 탄소를 명시한다. (원자 인덱스/좌표는 라벨 표시와
          // 무관하게 그대로라 화살표 오버레이 정렬에는 영향 없음)
          const drawer = new SmilesDrawer.SvgDrawer({ width: WIDTH, height: HEIGHT, showCarbons: 'all' })
          drawer.draw(tree, svgEl, 'dark')
          const coords = getAtomCoords(drawer.preprocessor.graph)
          setAtomCoords(coords)

          // smiles-drawer's own viewBox pads generously, which leaves small
          // reaction fragments (2-3 atoms) looking tiny in a mostly-empty
          // canvas. Recompute a tight viewBox around the actual atom
          // positions (matching the canvas aspect ratio so content fills it
          // without stretching) so the molecule reads at a legible size.
          const points = Array.from(coords.values())
          if (points.length > 0) {
            const PAD = 30
            const MIN_SPAN = 70
            let minX = Math.min(...points.map((p) => p.x)) - PAD
            let maxX = Math.max(...points.map((p) => p.x)) + PAD
            let minY = Math.min(...points.map((p) => p.y)) - PAD
            let maxY = Math.max(...points.map((p) => p.y)) + PAD
            let w = Math.max(maxX - minX, MIN_SPAN)
            let h = Math.max(maxY - minY, MIN_SPAN)

            const targetAspect = WIDTH / HEIGHT
            if (w / h < targetAspect) {
              const newW = h * targetAspect
              const cx = (minX + maxX) / 2
              minX = cx - newW / 2
              w = newW
            } else {
              const newH = w / targetAspect
              const cy = (minY + maxY) / 2
              minY = cy - newH / 2
              h = newH
            }

            const tightViewBox = `${minX} ${minY} ${w} ${h}`
            svgEl.setAttribute('viewBox', tightViewBox)
            setViewBox(tightViewBox)
          } else {
            const vb = svgEl.getAttribute('viewBox')
            if (vb) setViewBox(vb)
          }
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
        <ArrowOverlay stepId={step.id} arrows={visibleArrows} atomCoords={atomCoords} />
        {showDebugIndices && <AtomIndexDebugOverlay atomCoords={atomCoords} />}
      </svg>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  )
}
