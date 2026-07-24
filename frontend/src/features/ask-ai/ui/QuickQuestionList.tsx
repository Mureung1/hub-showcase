import { ChevronRight } from 'lucide-react'

import { QUICK_QUESTIONS } from '../model/quickQuestions'
import {
  CardList,
  QuestionChevron,
  QuestionDescription,
  QuestionIcon,
  QuestionRow,
  QuestionTextGroup,
  QuestionTitle,
} from './QuickQuestionList.styles'

interface QuickQuestionListProps {
  onSelectQuestion: (question: string) => void
}

export const QuickQuestionList = ({ onSelectQuestion }: QuickQuestionListProps) => (
  <CardList>
    {QUICK_QUESTIONS.map((quickQuestion) => {
      const Icon = quickQuestion.icon

      return (
        <QuestionRow
          key={quickQuestion.id}
          type="button"
          onClick={() => onSelectQuestion(quickQuestion.question)}
        >
          <QuestionIcon>
            <Icon size={18} />
          </QuestionIcon>
          <QuestionTextGroup>
            <QuestionTitle>{quickQuestion.title}</QuestionTitle>
            <QuestionDescription>{quickQuestion.description}</QuestionDescription>
          </QuestionTextGroup>
          <QuestionChevron>
            <ChevronRight size={16} />
          </QuestionChevron>
        </QuestionRow>
      )
    })}
  </CardList>
)
