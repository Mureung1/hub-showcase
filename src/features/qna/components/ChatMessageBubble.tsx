import type { ChatMessage } from '../types'

interface ChatMessageBubbleProps {
  message: ChatMessage
}

export default function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className="max-w-[85%] rounded-[10px] px-2.5 py-1.5 text-[11.5px] leading-relaxed"
      style={
        isUser
          ? { background: 'var(--color-accent-fill)', color: 'var(--color-accent-text)', marginLeft: 'auto' }
          : {
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-card)',
            }
      }
    >
      {message.text}
    </div>
  )
}
