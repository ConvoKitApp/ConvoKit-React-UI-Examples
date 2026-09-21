import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ShowcaseApp } from './ShowcaseApp'

afterEach(cleanup)

describe('ShowcaseApp', () => {
  it('renders and switches between all three package configurations', () => {
    window.history.replaceState({}, '', '/?variant=standard')
    render(<ShowcaseApp />)
    expect(screen.getByRole('heading', { name: '1 · Standard components' })).toBeVisible()
    // The package renders previews, activity times and unread badges from the fixture summaries.
    expect(screen.getByText('You: I linked this conversation to the support case.')).toBeVisible()
    expect(screen.getByText('Jordan Lee: Photo')).toBeVisible()
    expect(screen.getByText('Alex Rivera: postmortem-draft.pdf')).toBeVisible()
    expect(screen.getByRole('img', { name: '2 unread' })).toBeVisible()
    expect(screen.getByRole('img', { name: '104 unread' })).toHaveTextContent('99+')
    expect(screen.queryByRole('img', { name: '0 unread' })).toBeNull()
    // Design review has nothing unread but Maya marked it: the package renders its numberless dot, not a count.
    const dot = screen.getByRole('img', { name: 'Unread' })
    expect(dot).toHaveClass('ckui-badge', 'ckui-badge--dot')
    expect(dot).toBeEmptyDOMElement()
    expect(dot.closest('[data-unread]')).toHaveTextContent('Design review')
    fireEvent.click(screen.getByRole('button', { name: 'Branded support' }))
    expect(screen.getByRole('heading', { name: '2 · Branded customer support' })).toBeVisible()
    expect(screen.getByText('Priority support · SLA 18 min')).toBeVisible()
    // Custom rows receive the same summary/currentUserId and render their own badge from it,
    // with the package's accessible name (exact count unless the server capped it) and 99+ overflow label.
    expect(screen.getByText('Alex Rivera: Payment verification is still pending on ticket CK-4821.')).toBeVisible()
    expect(screen.getByLabelText('2 unread')).toHaveTextContent('2')
    expect(screen.getByLabelText('104 unread')).toHaveTextContent('99+')
    expect(screen.queryByLabelText('99+ unread')).toBeNull()
    // The custom row follows the same dot rule for the marked room: `isUnread` with a count of 0.
    expect(screen.getByRole('img', { name: 'Unread' })).toHaveClass('branded-row__dot')
    expect(screen.queryByLabelText('0 unread')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Compact operations' }))
    expect(screen.getByRole('heading', { name: '3 · Compact operations view' })).toBeVisible()
    expect(screen.getByText('Jordan Lee is responding…')).toBeVisible()
    expect(screen.getByRole('img', { name: '2 unread' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Unread' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '0 unread' })).toBeNull()
  })
})
