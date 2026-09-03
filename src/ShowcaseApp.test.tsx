import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ShowcaseApp } from './ShowcaseApp'

afterEach(cleanup)

describe('ShowcaseApp', () => {
  it('renders and switches between all three package configurations', () => {
    window.history.replaceState({}, '', '/?variant=standard')
    render(<ShowcaseApp />)
    expect(screen.getByRole('heading', { name: '1 · Standard components' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Branded support' }))
    expect(screen.getByRole('heading', { name: '2 · Branded customer support' })).toBeVisible()
    expect(screen.getByText('Priority support · SLA 18 min')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Compact operations' }))
    expect(screen.getByRole('heading', { name: '3 · Compact operations view' })).toBeVisible()
    expect(screen.getByText('Jordan Lee is responding…')).toBeVisible()
  })
})
