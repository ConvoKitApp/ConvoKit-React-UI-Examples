import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShowcaseApp } from './ShowcaseApp'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

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
  it('edits and deletes own messages through the controlled views with fixture callbacks', async () => {
    window.history.replaceState({}, '', '/?variant=standard')
    render(<ShowcaseApp />)
    const row = (id: string) => within(document.querySelector<HTMLElement>(`[data-message-id="${id}"]`)!)
    // The package labels Alex's edited row from `revision` alone and offers the actions only on Maya's own
    // confirmed rows; Alex's and Jordan's rows render exactly as in 0.7.
    expect(row('message-1').getByLabelText('Edited')).toHaveClass('ckui-message-edited')
    expect(screen.getAllByLabelText('Edited')).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Edit message' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Delete message' })).toHaveLength(2)
    expect(row('message-1').queryByRole('button', { name: 'Edit message' })).toBeNull()
    expect(row('message-3').queryByRole('button', { name: 'Delete message' })).toBeNull()

    // Edit mode is a pure function of `editingMessage`: the default composer shows the banner, is prefilled
    // with the snapshot text, hides the attachment button and saves through `onSaveEdit`, which bumps the
    // fixture row's revision so the package labels it `Edited`; the inbox preview follows the new text.
    fireEvent.click(row('message-4').getByRole('button', { name: 'Edit message' }))
    expect(screen.getByRole('status')).toHaveTextContent('Editing message')
    expect(screen.getByRole('status')).toHaveTextContent('I linked this conversation to the support case.')
    const field = screen.getByRole('textbox', { name: 'Message' })
    expect(field).toHaveValue('I linked this conversation to the support case.')
    expect(screen.queryByRole('button', { name: 'Add attachment' })).toBeNull()
    fireEvent.change(field, { target: { value: 'I linked this conversation to support case CK-4821.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save message' }))
    expect(await row('message-4').findByText('I linked this conversation to support case CK-4821.')).toHaveClass('ckui-message-text')
    expect(row('message-4').getByLabelText('Edited')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Edited')).toHaveLength(2)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add attachment' })).toBeInTheDocument()
    expect(field).toHaveValue('')
    expect(screen.getByText('You: I linked this conversation to support case CK-4821.')).toBeVisible()

    // Escape cancels through `onCancelEdit` and restores the (empty) draft that was stashed on entry.
    fireEvent.click(row('message-2').getByRole('button', { name: 'Edit message' }))
    expect(field).toHaveValue('Great. I approved the copy and shared the release notes.')
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(screen.queryByRole('status')).toBeNull()
    expect(field).toHaveValue('')

    // The package's inline confirmation sends nothing until `Delete`; `onDeleteMessage` then removes the
    // fixture row and the preview falls back to the previous surviving message.
    fireEvent.click(row('message-4').getByRole('button', { name: 'Delete message' }))
    expect(row('message-4').getByRole('group', { name: 'Delete this message?' })).toBeInTheDocument()
    fireEvent.click(row('message-4').getByRole('button', { name: 'Cancel delete' }))
    expect(row('message-4').queryByRole('group')).toBeNull()
    fireEvent.click(row('message-4').getByRole('button', { name: 'Delete message' }))
    fireEvent.click(row('message-4').getByRole('button', { name: 'Confirm delete' }))
    expect(document.querySelector('[data-message-id="message-4"]')).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Edit message' })).toHaveLength(1)
    expect(screen.getByText('Jordan Lee: Attaching the final handoff document.')).toBeVisible()

    // The branded composer receives `editing` and saves through the same `send`; the default rows keep the
    // package actions.
    fireEvent.click(screen.getByRole('button', { name: 'Branded support' }))
    fireEvent.click(row('message-2').getByRole('button', { name: 'Edit message' }))
    const banner = screen.getByRole('status')
    expect(banner).toHaveClass('branded-editing')
    expect(banner).toHaveTextContent('Editing message')
    expect(banner).toHaveTextContent('Great. I approved the copy and shared the release notes.')
    expect(screen.queryByRole('button', { name: 'Attach' })).toBeNull()
    const reply = screen.getByPlaceholderText('Edit your reply…')
    expect(reply).toHaveValue('Great. I approved the copy and shared the release notes.')
    fireEvent.change(reply, { target: { value: 'Great. I approved the copy and shared the final release notes.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await row('message-2').findByText('Great. I approved the copy and shared the final release notes.')).toHaveClass('ckui-message-text')
    expect(row('message-2').getByLabelText('Edited')).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: 'Attach' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()

    // The compact custom row renders `isEdited` and the `edit` / `remove` context itself; `remove` asks the
    // view's `confirmDelete` first, so a declined host dialog keeps the row.
    fireEvent.click(screen.getByRole('button', { name: 'Compact operations' }))
    const compact = (text: string) => within(screen.getByText(text).closest<HTMLElement>('.compact-message')!)
    expect(compact('The final launch checklist is ready for review.').getByLabelText('Edited').tagName).toBe('EM')
    expect(compact('The final launch checklist is ready for review.').queryByRole('button', { name: 'Edit message' })).toBeNull()
    expect(compact('Great. I approved the copy and shared the final release notes.').getByLabelText('Edited')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Edit message' })).toHaveLength(1)
    fireEvent.click(compact('Great. I approved the copy and shared the final release notes.').getByRole('button', { name: 'Edit message' }))
    expect(screen.getByRole('status')).toHaveClass('compact-editing')
    const line = screen.getByPlaceholderText('Edit message')
    expect(line).toHaveValue('Great. I approved the copy and shared the final release notes.')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel editing' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByPlaceholderText('Message')).toHaveValue('')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    fireEvent.click(compact('Great. I approved the copy and shared the final release notes.').getByRole('button', { name: 'Delete message' }))
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledWith('Delete "Great. I approved the copy and shared the final release notes."?'))
    expect(screen.getByText('Great. I approved the copy and shared the final release notes.')).toBeInTheDocument()
    fireEvent.click(compact('Great. I approved the copy and shared the final release notes.').getByRole('button', { name: 'Delete message' }))
    await vi.waitFor(() => expect(screen.queryByText('Great. I approved the copy and shared the final release notes.')).toBeNull())
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: 'Edit message' })).toBeNull()
    expect(screen.getByText('The final launch checklist is ready for review.')).toBeInTheDocument()
  })
})
