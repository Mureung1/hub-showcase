import { ChevronRight } from 'lucide-react'

import { QUICK_QUESTIONS, type QuickQuestion } from '../model/quickQuestions'
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
  onSelectQuestion: (quickQuestion: QuickQuestion) => void
  isDisabled?: boolean
}

export const QuickQuestionList = ({
  onSelectQuestion,
  isDisabled = false,
}: QuickQuestionListProps) => (
  <CardList>
    {QUICK_QUESTIONS.map((quickQuestion) => {
      const Icon = quickQuestion.icon

      return (
        <QuestionRow
          key={quickQuestion.id}
          type="button"
          disabled={isDisabled}
          onClick={() => onSelectQuestion(quickQuestion)}
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
