import type { NumberedPoint } from '../model/types'
import {
  Column,
  ColumnTitle,
  PointDescription,
  PointOrder,
  PointRow,
  PointText,
  PointTextGroup,
  SectionGrid,
} from './ReasonsRisksSection.styles'

interface ReasonsRisksSectionProps {
  reasonsTitle: string
  reasons: NumberedPoint[]
  risksTitle: string
  risks: NumberedPoint[]
}

const PointList = ({ points }: { points: NumberedPoint[] }) => (
  <>
    {points.map((point) => (
      <PointRow key={point.order}>
        <PointOrder>{point.order}</PointOrder>
        <PointTextGroup>
          <PointText>{point.text}</PointText>
          {point.description && <PointDescription>({point.description})</PointDescription>}
        </PointTextGroup>
      </PointRow>
    ))}
  </>
)

export const ReasonsRisksSection = ({ reasonsTitle, reasons, risksTitle, risks }: ReasonsRisksSectionProps) => (
  <SectionGrid>
    <Column>
      <ColumnTitle>{reasonsTitle}</ColumnTitle>
      <PointList points={reasons} />
    </Column>
    <Column>
      <ColumnTitle>{risksTitle}</ColumnTitle>
      <PointList points={risks} />
    </Column>
  </SectionGrid>
)
