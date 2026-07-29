import { useParams } from 'react-router-dom'

import { Button } from '@/shared/ui/Button'
import { EasyInterpretationNote } from '@/shared/ui/EasyInterpretationNote'

import { getStockAnalysis } from '../model/stockAnalysisData'
import { JudgmentSection } from './JudgmentSection'
import { PriceScenarioSection } from './PriceScenarioSection'
import { ReasonsRisksSection } from './ReasonsRisksSection'
import { RelatedNewsCard } from './RelatedNewsCard'
import { StockAnalysisHeader } from './StockAnalysisHeader'
import {
  ContentWrapper,
  Disclaimer,
  Divider,
  FollowUpButtonWrapper,
  MetaText,
  PageRoot,
  ScrollArea,
} from './StockAnalysisPage.styles'

export default function StockAnalysisPage() {
  const { code } = useParams<{ code: string }>()
  const analysis = getStockAnalysis(code)

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <StockAnalysisHeader header={analysis.header} />

          <Divider />
          <JudgmentSection judgment={analysis.judgment} />

          <Divider />
          <ReasonsRisksSection
            reasonsTitle="주요 근거"
            reasons={analysis.reasons}
            risksTitle="확인할 리스크"
            risks={analysis.risks}
          />

          <Divider />
          <PriceScenarioSection title="가격 시나리오" scenarios={analysis.scenarios} />

          <EasyInterpretationNote>{analysis.easyExplanation}</EasyInterpretationNote>

          <RelatedNewsCard relatedNews={analysis.relatedNews} />

          <MetaText>
            {analysis.meta.dataDate} · {analysis.meta.source} · {analysis.meta.note}
          </MetaText>

          <FollowUpButtonWrapper>
            <Button variant="outline">이 분석에 추가 질문하기</Button>
          </FollowUpButtonWrapper>

          <Disclaimer>
            가즈아는 투자 판단을 돕는 서비스이며, 최종 투자 결정과 책임은 사용자에게 있습니다.
          </Disclaimer>
        </ContentWrapper>
      </ScrollArea>
    </PageRoot>
  )
}
