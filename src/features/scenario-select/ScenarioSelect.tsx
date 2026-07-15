import type { RefObject } from 'react'
import { catAssistantAssets, scenarios, type Mode, type Scenario, type ScenarioId } from '../../entities/message'
import { AssistantPrompt } from '../guided-chat'

type ScenarioSelectProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  mode: Mode | null
  selectedScenarioId: ScenarioId | null
  onBack: () => void
  onSelect: (scenario: Scenario) => void
}

function ScenarioSelect({ headingRef, mode, selectedScenarioId, onBack, onSelect }: ScenarioSelectProps) {
  return (
    <div className="demo-panel wizard-panel">
      <button className="wizard-back" onClick={onBack} type="button">
        ← 방식 다시 고르기
      </button>
      <AssistantPrompt
        assistantName="답냥이"
        description="관계마다 말의 거리와 예의가 달라요. 고르면 그 관계의 냥이가 이어서 도와줄게요."
        headingRef={headingRef}
        title={mode === 'reply' ? '누구에게 답장하냥?' : '누구에게 먼저 연락하냥?'}
      />

      <div aria-label="관계 빠른 답변" className="scenario-list">
        {scenarios.map((scenario) => (
          <button
            className="scenario-card"
            data-scenario={scenario.id}
            data-selected={scenario.id === selectedScenarioId}
            key={scenario.id}
            onClick={() => onSelect(scenario)}
            type="button"
          >
            <span className="scenario-card-main">
              <span className="scenario-card-copy">
                <strong>{scenario.helper}</strong>
                <span className="scenario-card-name">{scenario.name}</span>
              </span>
              <span aria-hidden="true" className="scenario-card-art" data-asset-slot="cat">
                {catAssistantAssets[scenario.id].assetPath ? (
                  <img
                    alt={catAssistantAssets[scenario.id].alt}
                    src={catAssistantAssets[scenario.id].assetPath ?? undefined}
                  />
                ) : (
                  <span className="scenario-card-art-placeholder">냥</span>
                )}
              </span>
            </span>
            <small>{scenario.summary}</small>
            <span className="scenario-card-cta">{scenario.helper}에게 이어 말하기 →</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ScenarioSelect
