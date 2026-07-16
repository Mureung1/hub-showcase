import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { ChatMessage } from '../features/qna/types'
import { useQnaPanel } from '../features/qna/context/QnaPanelContext'
import ChatInput from '../features/qna/components/ChatInput'
import ChatMessageBubble from '../features/qna/components/ChatMessageBubble'
import { askAI } from '../lib/gemini'
import { loadRecentQnaLogs, saveQnaLog } from '../features/qna/lib/qnaLogsApi'

interface ChapterAssistantProps {
  context: string
}

export default function ChapterAssistant({ context }: ChapterAssistantProps) {
  const { isOpen } = useQnaPanel()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 })

  useEffect(() => {
    loadRecentQnaLogs().then(setMessages)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    function handleMouseMove(e: MouseEvent) {
      setOffset({
        x: dragStart.current.offsetX + (e.clientX - dragStart.current.mouseX),
        y: dragStart.current.offsetY + (e.clientY - dragStart.current.mouseY),
      })
    }
    function handleMouseUp() {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!isOpen) return null

  function handleDragHandleMouseDown(e: ReactMouseEvent) {
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
    setIsDragging(true)
  }

  async function handleSend(question: string) {
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setIsLoading(true)
    try {
      const answer = await askAI(question, context)
      setMessages((prev) => [...prev, { role: 'ai', text: answer }])
      saveQnaLog(question, answer, context).catch((err) => console.error('Q&A 저장 실패:', err))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 질문 기능을 잠시 이용할 수 없습니다.'
      setMessages((prev) => [...prev, { role: 'ai', text: message }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed bottom-4 right-4 w-[240px] rounded-[14px] border p-3"
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        background: 'rgba(11,13,18,0.9)',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgba(34,211,238,0.32)',
        boxShadow:
          '0 0 0 1px rgba(34,211,238,0.1), 0 0 30px rgba(34,211,238,0.22), 0 20px 44px rgba(0,0,0,0.55)',
      }}
    >
      <div
        className="mb-2 flex items-center gap-1.5"
        onMouseDown={handleDragHandleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
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
        {isLoading && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            답변 작성 중...
          </p>
        )}
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading} />

      <p className="mt-2 text-[9.5px]" style={{ color: 'var(--color-text-muted)' }}>
        AI 답변은 참고용이며 부정확할 수 있어요.
      </p>
    </div>
  )
}
