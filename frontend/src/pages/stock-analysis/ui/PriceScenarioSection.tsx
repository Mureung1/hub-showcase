import { Badge } from '@/shared/ui/Badge'

import type { PriceScenario } from '../model/types'
import {
  ScenarioCard,
  ScenarioDescription,
  ScenarioList,
  ScenarioTextGroup,
  ScenarioTitle,
  SectionRoot,
  SectionTitle,
} from './PriceScenarioSection.styles'

interface PriceScenarioSectionProps {
  title: string
  scenarios: PriceScenario[]
}

export const PriceScenarioSection = ({ title, scenarios }: PriceScenarioSectionProps) => (
  <SectionRoot>
    <SectionTitle>{title}</SectionTitle>
    <ScenarioList>
      {scenarios.map((scenario) => (
        <ScenarioCard key={scenario.id}>
          <Badge tone={scenario.direction}>{scenario.label}</Badge>
          <ScenarioTextGroup>
            <ScenarioTitle>{scenario.title}</ScenarioTitle>
            <ScenarioDescription>{scenario.description}</ScenarioDescription>
          </ScenarioTextGroup>
        </ScenarioCard>
      ))}
    </ScenarioList>
  </SectionRoot>
)
