import type { RefObject } from 'react'
import { catAssistantAssets, scenarios, type Mode, type Scenario, type ScenarioId } from '../../entities/message'

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
      <div className="section-heading">
        <span aria-hidden="true">2</span>
        <div>
          <h2 ref={headingRef} tabIndex={-1}>
            관계 고르기
          </h2>
          <p>{mode === 'reply' ? '답장할 상대는 누구인가요?' : '먼저 연락할 상대는 누구인가요?'}</p>
        </div>
      </div>

      <div className="scenario-list">
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
            <span className="scenario-card-cta">이 냥이와 말 고르기 →</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ScenarioSelect
