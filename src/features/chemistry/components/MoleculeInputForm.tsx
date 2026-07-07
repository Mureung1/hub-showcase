import { useState } from 'react'

export type InputMode = 'smiles' | 'name'

interface MoleculeInputFormProps {
  loading: boolean
  onSubmit: (value: string, mode: InputMode) => void
}

export default function MoleculeInputForm({ loading, onSubmit }: MoleculeInputFormProps) {
  const [mode, setMode] = useState<InputMode>('smiles')
  const [value, setValue] = useState('CCO')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) onSubmit(value.trim(), mode)
      }}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="flex overflow-hidden rounded-lg border border-zinc-700">
        <button
          type="button"
          onClick={() => setMode('smiles')}
          className={`px-3 py-2 text-sm font-medium ${
            mode === 'smiles' ? 'bg-cyan-400 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
          }`}
        >
          SMILES
        </button>
        <button
          type="button"
          onClick={() => setMode('name')}
          className={`px-3 py-2 text-sm font-medium ${
            mode === 'name' ? 'bg-cyan-400 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
          }`}
        >
          이름 검색
        </button>
      </div>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={mode === 'smiles' ? '예: CCO, c1ccccc1' : '예: aspirin, caffeine'}
        className="min-w-[220px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-300 disabled:opacity-40"
      >
        {loading ? '조회 중...' : '그리기'}
      </button>
    </form>
  )
}
