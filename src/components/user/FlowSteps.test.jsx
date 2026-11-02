import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import FlowSteps, { FLOW_STEPS } from './FlowSteps.jsx'
import PageHeader from '../ui/PageHeader.jsx'

describe('FlowSteps', () => {
  it('has Step 1, Step 2, Step 3 as names', () => {
    expect(FLOW_STEPS).toEqual(['Step 1', 'Step 2', 'Step 3'])
  })

  it('renders correctly inside PageHeader directly under title', () => {
    const html = renderToStaticMarkup(
      <PageHeader title="Ask a Question">
        <FlowSteps current={1} />
      </PageHeader>
    )

    expect(html).toContain('<h1 class="page-title">Ask a Question</h1>')
    expect(html).toContain('<ol class="aq-flow-steps" aria-label="Ask a Question steps">')
    expect(html).toContain('<li class="aq-flow-step is-active" aria-current="step"><span class="aq-flow-step__num" aria-hidden="true">1</span><span>Step 1</span></li>')
    expect(html).toContain('<li class="aq-flow-step"><span class="aq-flow-step__num" aria-hidden="true">2</span><span>Step 2</span></li>')
    expect(html).toContain('<li class="aq-flow-step"><span class="aq-flow-step__num" aria-hidden="true">3</span><span>Step 3</span></li>')

    // Verify ol.aq-flow-steps is placed inside page-header-title after h1.page-title
    const titleIndex = html.indexOf('<h1 class="page-title">Ask a Question</h1>')
    const stepsIndex = html.indexOf('<ol class="aq-flow-steps"')
    const actionsIndex = html.indexOf('<div class="page-header-actions">')

    expect(titleIndex).toBeGreaterThan(-1)
    expect(stepsIndex).toBeGreaterThan(titleIndex)
    expect(actionsIndex).toBeGreaterThan(stepsIndex)
  })
})
