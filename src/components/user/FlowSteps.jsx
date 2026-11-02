export const FLOW_STEPS = ['Step 1', 'Step 2', 'Step 3']

export default function FlowSteps({ current = 1, onStepClick }) {
  return (
    <ol className="aq-flow-steps" aria-label="Ask a Question steps">
      {FLOW_STEPS.map((label, index) => {
        const step = index + 1
        const state = step === current ? ' is-active' : step < current ? ' is-done' : ''
        const isClickable = Boolean(onStepClick && step < current)
        return (
          <li
            key={label}
            className={`aq-flow-step${state}${isClickable ? ' is-clickable' : ''}`}
            aria-current={step === current ? 'step' : undefined}
            onClick={isClickable ? () => onStepClick(step) : undefined}
            style={isClickable ? { cursor: 'pointer' } : undefined}
          >
            <span className="aq-flow-step__num" aria-hidden="true">{step}</span>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
