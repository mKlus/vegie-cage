import type { Step } from '../lib/guide'

export function BuildGuide({ steps }: { steps: Step[] }) {
  return (
    <div className="guide">
      <ol>
        {steps.map((step) => (
          <li key={step.id}>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
