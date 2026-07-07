import './FlowDiagram.css'

function FlowDiagram({ heading, steps }) {
  return (
    <section className="flow-section">
      <h2>{heading}</h2>
      <div className="flow-diagram">
        {steps.map((step, index) => (
          <div className="flow-step-wrapper" key={step.label}>
            <div className="flow-step">
              <span className="flow-icon" aria-hidden="true">
                {step.icon}
              </span>
              <span className="flow-label">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <span className="flow-arrow" aria-hidden="true">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default FlowDiagram
