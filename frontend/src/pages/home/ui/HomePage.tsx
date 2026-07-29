import { useEffect, useRef, useState } from 'react'

import { AskAiInputBar, QuickQuestionList, type QuickQuestion } from '@/features/ask-ai'
import { Spinner } from '@/shared/ui/Spinner'

import { getAiResponse, INITIAL_CHAT_MESSAGES, type ChatMessage } from '../model/aiChatResponses'
import {
  ChatAuthor,
  ChatBubble,
  ChatMessageRow,
  ChatText,
  ChatTimeline,
  ContentWrapper,
  LoadingBubble,
  PageRoot,
  QuickQuestionsWrapper,
  ScrollArea,
  Subtitle,
  Title,
} from './HomePage.styles'

const CHAT_RESPONSE_DELAY_MS = 650

export default function HomePage() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES)
  const [isResponding, setIsResponding] = useState(false)
  const timeoutIdRef = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current)
      }
    },
    [],
  )

  const handleAsk = (nextQuestion: string) => {
    const trimmedQuestion = nextQuestion.trim()
    if (!trimmedQuestion || isResponding) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmedQuestion,
    }

    setQuestion('')
    setMessages((currentMessages) => [...currentMessages, userMessage])
    setIsResponding(true)

    timeoutIdRef.current = window.setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: getAiResponse(trimmedQuestion),
      }

      setMessages((currentMessages) => [...currentMessages, assistantMessage])
      setIsResponding(false)
    }, CHAT_RESPONSE_DELAY_MS)
  }

  const handleSelectQuickQuestion = (quickQuestion: QuickQuestion) => {
    setQuestion(quickQuestion.question)
    handleAsk(quickQuestion.question)
  }

  const handleSubmit = () => {
    handleAsk(question)
  }

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <Title>궁금한 종목이나 오늘 시장 흐름을 물어보세요.</Title>
          <Subtitle>상승 근거, 하락 리스크, 가능한 시나리오를 쉽게 정리해드려요.</Subtitle>
          <QuickQuestionsWrapper>
            <QuickQuestionList
              onSelectQuestion={handleSelectQuickQuestion}
              isDisabled={isResponding}
            />
          </QuickQuestionsWrapper>

          <ChatTimeline aria-live="polite">
            {messages.map((message) => (
              <ChatMessageRow key={message.id} role={message.role}>
                <ChatBubble role={message.role}>
                  <ChatAuthor>{message.role === 'assistant' ? 'GAZUA AI' : '나'}</ChatAuthor>
                  <ChatText>{message.text}</ChatText>
                </ChatBubble>
              </ChatMessageRow>
            ))}

            {isResponding && (
              <ChatMessageRow role="assistant">
                <LoadingBubble>
                  <Spinner size="small" label="AI response loading" />
                  답변 생성 중
                </LoadingBubble>
              </ChatMessageRow>
            )}
          </ChatTimeline>
        </ContentWrapper>
      </ScrollArea>
      <AskAiInputBar
        value={question}
        onChange={setQuestion}
        onSubmit={handleSubmit}
        isSubmitDisabled={question.trim().length === 0 || isResponding}
      />
    </PageRoot>
  )
}
