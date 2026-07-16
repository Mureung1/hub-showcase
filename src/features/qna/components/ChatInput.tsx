import { useState, type FormEvent } from 'react'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="이 화면에 대해 물어보세요"
        disabled={disabled}
        className="h-8 flex-1 rounded-[999px] border px-3 text-[11.5px] outline-none disabled:opacity-50"
        style={{
          borderColor: 'var(--color-border-card-strong)',
          background: 'var(--color-bg-page)',
          color: 'var(--color-text-primary)',
        }}
      />
      <button
        type="submit"
        disabled={disabled}
        aria-label="전송"
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full disabled:opacity-50"
        style={{ background: 'var(--color-accent)', color: '#06232a', boxShadow: '0 0 12px rgba(34,211,238,0.5)' }}
      >
        <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 8h11M9 4l4 4-4 4" />
        </svg>
      </button>
    </form>
  )
}
