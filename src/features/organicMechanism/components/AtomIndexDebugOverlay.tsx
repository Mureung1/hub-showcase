import type { AtomIndex } from '../data/types'

interface AtomIndexDebugOverlayProps {
  atomCoords: Map<AtomIndex, { x: number; y: number }>
}

/** Dev-only aid for authoring reaction data: labels every atom with its SMILES index. */
export default function AtomIndexDebugOverlay({ atomCoords }: AtomIndexDebugOverlayProps) {
  return (
    <>
      {Array.from(atomCoords.entries()).map(([index, pos]) => (
        <text key={index} x={pos.x + 8} y={pos.y - 8} fontSize={9} fill="#22d3ee">
          {index}
        </text>
      ))}
    </>
  )
}
