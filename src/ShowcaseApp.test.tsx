import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShowcaseApp } from './ShowcaseApp'

const row = (id: string) => within(document.querySelector<HTMLElement>(`[data-message-id="${id}"]`)!)
/** The package's quoted block on one row, scoped so a quote's author never collides with the row's sender. */
const quote = (id: string) => document.querySelector<HTMLElement>(`[data-message-id="${id}"] .ckui-message-quote`)

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

    // The same custom composer receives `replying` and renders its own cancellable strip, naming the quoted
    // author. Cancelling leaves the field alone: quoting adds context to what is being typed, so unlike edit
    // mode nothing is stashed or restored.
    const brandedField = screen.getByPlaceholderText('Reply to customer…')
    fireEvent.change(brandedField, { target: { value: 'Looking into that now' } })
    fireEvent.click(row('message-1').getByRole('button', { name: 'Reply to message' }))
    const strip = screen.getByRole('status')
    expect(strip).toHaveClass('branded-replying')
    expect(strip).toHaveTextContent('Replying to Alex Rivera')
    expect(strip).toHaveTextContent('The final launch checklist is ready for review.')
    expect(brandedField).toHaveValue('Looking into that now')
    expect(screen.getByRole('button', { name: 'Attach' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(brandedField).toHaveValue('Looking into that now')
    fireEvent.change(brandedField, { target: { value: '' } })

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
  }, 20_000)

  it('renders the three quoted-block states and jumps inside and outside the loaded window', async () => {
    window.history.replaceState({}, '', '/?variant=standard')
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<ShowcaseApp />)

    // One branch per fixture row. A parent inside the window and a parent in the older history both resolve
    // to a quote; the parent that was deleted keeps its reference and says the original is gone.
    expect(quote('message-1')).toBeNull()
    expect(within(quote('message-2')!).getByText('Alex Rivera')).toHaveClass('ckui-message-quote__author')
    expect(within(quote('message-2')!).getByText('The final launch checklist is ready for review.')).toHaveClass('ckui-message-quote__text')
    expect(within(quote('message-3')!).getByText('Jordan Lee')).toHaveClass('ckui-message-quote__author')
    expect(within(quote('message-3')!).getByText('Here is the rollout plan we agreed in the architecture review.')).toHaveClass('ckui-message-quote__text')
    expect(within(quote('message-4')!).getByText('Original message unavailable')).toHaveClass('ckui-message-quote__unavailable')
    expect(quote('message-4')!.querySelector('.ckui-message-quote__author')).toBeNull()
    // Reply is offered on every confirmed row, not only the viewer's own: any member may quote any message.
    expect(screen.getAllByRole('button', { name: 'Reply to message' })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: 'Edit message' })).toHaveLength(2)

    // A parent already on screen is centred, focused and highlighted; the window does not change. The scroll
    // guard goes up for this case too, because the package's own scroll fires the event a user's scroll does.
    fireEvent.click(row('message-2').getByRole('button', { name: 'Go to quoted message' }))
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' })
    const inWindow = document.querySelector<HTMLElement>('[data-message-id="message-1"]')!
    expect(document.activeElement).toBe(inWindow)
    expect(inWindow.querySelector('article')).toHaveClass('ckui-message-row--highlighted')
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('button', { name: 'Jump to latest messages' })).toBeNull()
    expect(document.querySelector('[data-message-id="message-4"]')).not.toBeNull()
    await waitFor(() => expect(screen.getByRole('log')).not.toHaveAttribute('aria-busy'))

    // A parent outside the window is answered with a bounded window around it that REPLACES the loaded one.
    // The live region is busy until the scroll and focus move have run, and the way back is offered
    // throughout. Nothing is re-opened: the same fixture room and its edits are still behind it.
    fireEvent.click(row('message-3').getByRole('button', { name: 'Go to quoted message' }))
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'true')
    expect(document.querySelector('[data-message-id="message-3"]')).toBeNull()
    const jumped = document.querySelector<HTMLElement>('[data-message-id="history-2"]')!
    expect(jumped.querySelector('article')).toHaveClass('ckui-message-row--highlighted')
    expect(document.activeElement).toBe(jumped)
    expect(screen.getByRole('button', { name: 'Jump to latest messages' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('log')).not.toHaveAttribute('aria-busy'))

    // The newer edge pages the jumped window forward through `onLoadNewer` (the package only arms that
    // trigger while `hasNewerMessages`), and `Jump to latest` drops the window for the newest page.
    fireEvent.scroll(screen.getByRole('log'))
    expect(await screen.findByText('Loading newer messages\u2026')).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('[data-message-id="message-1"]')).not.toBeNull())
    expect(document.querySelector('[data-message-id="history-1"]')).not.toBeNull()
    expect(document.querySelector('[data-message-id="message-4"]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest messages' }))
    await waitFor(() => expect(document.querySelector('[data-message-id="message-4"]')).not.toBeNull())
    expect(document.querySelector('[data-message-id="history-1"]')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Jump to latest messages' })).toBeNull()
  }, 20_000)

  it('quotes through the composer strip and re-reads the parent when it is edited or deleted', async () => {
    window.history.replaceState({}, '', '/?variant=standard')
    render(<ShowcaseApp />)
    const field = screen.getByRole('textbox', { name: 'Message' })

    // Quoting someone else's message: the strip names the author, and cancelling leaves the field alone.
    // Replying adds context to what is being typed, so unlike edit mode nothing is stashed or restored.
    fireEvent.change(field, { target: { value: 'Half-typed thought' } })
    fireEvent.click(row('message-1').getByRole('button', { name: 'Reply to message' }))
    expect(screen.getByRole('status')).toHaveTextContent('Replying to Alex Rivera')
    expect(field).toHaveValue('Half-typed thought')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(field).toHaveValue('Half-typed thought')

    // Editing and replying are mutually exclusive: entering edit mode ends the reply, and Escape leaves it
    // with the draft that was stashed when editing started.
    fireEvent.click(row('message-1').getByRole('button', { name: 'Reply to message' }))
    fireEvent.click(row('message-2').getByRole('button', { name: 'Edit message' }))
    expect(screen.getByRole('status')).toHaveTextContent('Editing message')
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(screen.queryByRole('status')).toBeNull()
    expect(field).toHaveValue('Half-typed thought')

    // …and the other direction: quoting from inside edit mode ends the edit, leaving exactly one strip.
    fireEvent.click(row('message-4').getByRole('button', { name: 'Edit message' }))
    expect(screen.getByRole('status')).toHaveTextContent('Editing message')
    expect(field).toHaveValue('I linked this conversation to the support case.')
    fireEvent.click(row('message-1').getByRole('button', { name: 'Reply to message' }))
    const single = screen.getByRole('status')
    expect(single).toHaveTextContent('Replying to Alex Rivera')
    expect(single).not.toHaveTextContent('Editing message')
    expect(field).toHaveValue('Half-typed thought')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }))
    expect(screen.queryByRole('status')).toBeNull()

    // Sending with a target stamps `replyToMessageId` on the new row, clears the strip and empties the field.
    fireEvent.click(row('message-2').getByRole('button', { name: 'Reply to message' }))
    expect(screen.getByRole('status')).toHaveTextContent('Replying to Maya Chen')
    fireEvent.change(field, { target: { value: 'Sharing the signed-off notes now.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    const sent = await screen.findByText('Sharing the signed-off notes now.', { selector: '.ckui-message-text' })
    const sentId = sent.closest<HTMLElement>('[data-message-id]')!.dataset.messageId!
    expect(screen.queryByRole('status')).toBeNull()
    expect(field).toHaveValue('')
    expect(within(quote(sentId)!).getByText('Maya Chen')).toHaveClass('ckui-message-quote__author')
    expect(within(quote(sentId)!).getByText('Great. I approved the copy and shared the release notes.')).toHaveClass('ckui-message-quote__text')

    // The quote is re-read, never copied: editing the parent changes what the reply shows.
    fireEvent.click(row('message-2').getByRole('button', { name: 'Edit message' }))
    fireEvent.change(field, { target: { value: 'Great. I approved the copy and shared the signed release notes.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save message' }))
    await waitFor(() =>
      expect(within(quote(sentId)!).getByText('Great. I approved the copy and shared the signed release notes.')).toHaveClass('ckui-message-quote__text'),
    )

    // Deleting the parent keeps the reference and degrades the quote; the reply itself stays, and activating
    // a quote whose original is gone changes nothing and raises nothing.
    fireEvent.click(row('message-2').getByRole('button', { name: 'Delete message' }))
    fireEvent.click(row('message-2').getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(document.querySelector('[data-message-id="message-2"]')).toBeNull())
    expect(within(quote(sentId)!).getByText('Original message unavailable')).toHaveClass('ckui-message-quote__unavailable')
    expect(row(sentId).getByText('Sharing the signed-off notes now.')).toHaveClass('ckui-message-text')
    fireEvent.click(row(sentId).getByRole('button', { name: 'Go to quoted message' }))
    expect(within(quote(sentId)!).getByText('Original message unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  }, 20_000)

  it('hands the compact custom row and composer the flat reply context', async () => {
    window.history.replaceState({}, '', '/?variant=compact')
    render(<ShowcaseApp />)
    const compact = (text: string) => within(screen.getByText(text).closest<HTMLElement>('.compact-message')!)

    // The custom row renders the quote itself from `replyPreview`, with the same three states, and gets
    // `reply` on every confirmed row while `edit` stays limited to the viewer's own.
    expect(compact('Great. I approved the copy and shared the release notes.').getByRole('button', { name: 'Go to quoted message' }))
      .toHaveTextContent('Alex Rivera: The final launch checklist is ready for review.')
    expect(compact('I linked this conversation to the support case.').getByRole('button', { name: 'Go to quoted message' }))
      .toHaveTextContent('Original message unavailable')
    expect(compact('The final launch checklist is ready for review.').queryByRole('button', { name: 'Go to quoted message' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Reply to message' })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: 'Edit message' })).toHaveLength(2)

    fireEvent.click(compact('The final launch checklist is ready for review.').getByRole('button', { name: 'Reply to message' }))
    expect(screen.getByRole('status')).toHaveClass('compact-replying')
    expect(screen.getByRole('status')).toHaveTextContent('The final launch checklist is ready for review.')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }))
    expect(screen.queryByRole('status')).toBeNull()

    // A custom row's quote jumps exactly as the package's own does, through the same `onJumpToMessage`.
    fireEvent.click(compact('Attaching the final handoff document.').getByRole('button', { name: 'Go to quoted message' }))
    await waitFor(() => expect(screen.getByText('Here is the rollout plan we agreed in the architecture review.')).toBeInTheDocument())
    expect(screen.queryByText('Attaching the final handoff document.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest messages' }))
    expect(await screen.findByText('Attaching the final handoff document.')).toBeInTheDocument()
  })
})
