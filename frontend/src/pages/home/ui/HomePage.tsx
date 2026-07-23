import { useState } from 'react'

import { AskAiInputBar, QuickQuestionList } from '@/features/ask-ai'

import { ContentWrapper, PageRoot, QuickQuestionsWrapper, ScrollArea, Subtitle, Title } from './HomePage.styles'

export default function HomePage() {
  const [question, setQuestion] = useState('')

  const handleSubmit = () => {}

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <Title>궁금한 종목이나 오늘 시장 흐름을 물어보세요.</Title>
          <Subtitle>상승 근거, 하락 리스크, 가능한 시나리오를 쉽게 정리해드려요.</Subtitle>
          <QuickQuestionsWrapper>
            <QuickQuestionList onSelectQuestion={setQuestion} />
          </QuickQuestionsWrapper>
        </ContentWrapper>
      </ScrollArea>
      <AskAiInputBar
        value={question}
        onChange={setQuestion}
        onSubmit={handleSubmit}
        isSubmitDisabled={question.trim().length === 0}
      />
    </PageRoot>
  )
}
