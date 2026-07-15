import { useState } from 'react'
import type { ChatMessage } from '../features/qna/types'
import { useQnaPanel } from '../features/qna/context/QnaPanelContext'
import ChatInput from '../features/qna/components/ChatInput'
import ChatMessageBubble from '../features/qna/components/ChatMessageBubble'
import { getMockAnswer } from '../features/qna/lib/mockAnswer'

interface ChapterAssistantProps {
  context: string
}

export default function ChapterAssistant({ context }: ChapterAssistantProps) {
  const { isOpen } = useQnaPanel()
  const [messages, setMessages] = useState<ChatMessage[]>([])

  if (!isOpen) return null

  function handleSend(question: string) {
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'ai', text: getMockAnswer(question, context) }])
    }, 500)
  }

  return (
    <div
      className="absolute bottom-4 right-4 w-[240px] rounded-[14px] border p-3"
      style={{
        background: 'rgba(11,13,18,0.9)',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgba(34,211,238,0.32)',
        boxShadow:
          '0 0 0 1px rgba(34,211,238,0.1), 0 0 30px rgba(34,211,238,0.22), 0 20px 44px rgba(0,0,0,0.55)',
      }}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full"
          style={{
            boxShadow:
              '0 0 0 1px rgba(34,211,238,0.3), 0 0 0 4px rgba(34,211,238,0.08), 0 0 10px rgba(34,211,238,0.4)',
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
        </span>
        <span className="flex-1 text-[11.5px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
          AI Q&amp;A
        </span>
        <span
          className="rounded-[999px] px-1.5 py-0.5 text-[9px]"
          style={{ background: 'var(--color-accent-fill)', color: 'var(--color-accent-text)' }}
        >
          이 화면 기준
        </span>
      </div>

      <div className="mb-2 flex max-h-[180px] flex-col gap-1.5 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            지금 보는 단계에 대해 물어보세요.
          </p>
        )}
        {messages.map((message, index) => (
          <ChatMessageBubble key={index} message={message} />
        ))}
      </div>

      <ChatInput onSend={handleSend} />

      <p className="mt-2 text-[9.5px]" style={{ color: 'var(--color-text-muted)' }}>
        AI 답변은 참고용이며 부정확할 수 있어요. (mock 데이터)
      </p>
    </div>
  )
}
