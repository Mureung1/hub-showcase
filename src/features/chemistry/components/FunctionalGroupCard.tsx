import { useState } from 'react'
import Structure2DViewer from './Structure2DViewer'
import type { FunctionalGroupExample } from '../data/functionalGroups'

export default function FunctionalGroupCard({ example }: { example: FunctionalGroupExample }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="text-sm font-semibold text-zinc-100">{example.moleculeName}</h3>

      <div className="mt-2 flex justify-center">
        <Structure2DViewer
          smiles={example.smiles}
          showCarbons={example.forceShowCarbons ? 'all' : 'default'}
          highlightAtoms={
            revealed ? example.highlights.map((h) => [h.classNumber, h.color] as [number, string]) : []
          }
        />
      </div>

      {revealed ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {example.highlights.map((h) => (
              <span
                key={h.classNumber}
                className="rounded-full border px-2.5 py-1 text-xs font-medium"
                style={{ borderColor: h.color, color: h.color }}
              >
                {h.label}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRevealed(false)}
            className="mt-3 w-full rounded-lg border border-zinc-700 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-400 hover:text-cyan-300"
          >
            다시 가리기
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-3 w-full rounded-lg border border-zinc-700 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-400 hover:text-cyan-300"
        >
          어디가 관능기일까요? — 정답 확인
        </button>
      )}
    </div>
  )
}
