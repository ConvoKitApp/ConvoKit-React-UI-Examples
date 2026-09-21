import { fireEvent, render, screen, cleanup, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Conversation, ConvoKitClient, EditMessageInput, InboxEntry, MarkConversationReadOptions, Message } from '@convokitapp/sdk'
import { LiveExample } from './LiveExample'
import { DemoModel, sessionKey } from './demo'

/**
 * A connected 0.8 SDK as the published UI package sees it: one room with nothing unread, its membership
 * served to the caller, the `/unread` mark answering with the marker and the bumped version, and the author
 * routes (`PATCH`/`DELETE /messages/:id/own`) answering an edit with the bumped revision and a delete with
 * nothing. Maya's own older message was already edited once (`revision: 1`), Alex's newest one never was.
 */
const fake = vi.hoisted(() => {
  const subscription = () => ({ closed: false, unsubscribe: async () => undefined })
  const room: Conversation = {
    id: 'room-1', appId: 'demo-app', title: 'Launch room', displayTitle: 'Launch room', description: null, imageUrl: null,
    participants: [], createdAt: new Date('2026-08-26T09:00:00Z'), updatedAt: new Date('2026-08-26T11:00:00Z'),
  }
  const message: Message = {
    id: 'message-1', conversationId: 'room-1', senderId: 'convokit_open_alex', text: 'Hello Maya', media: [],
    createdAt: new Date('2026-08-26T11:00:00Z'), updatedAt: null, revision: 0,
  }
  const own: Message = {
    id: 'message-0', conversationId: 'room-1', senderId: 'convokit_open_maya', text: 'Morning Alex, launch is a go', media: [],
    createdAt: new Date('2026-08-26T10:58:00Z'), updatedAt: new Date('2026-08-26T10:59:00Z'), revision: 1,
  }
  const entry: InboxEntry = {
    conversation: room, latestMessage: message, unreadCount: 0, unreadCountCapped: false,
    readPosition: { messageId: message.id, createdAt: message.createdAt }, lastReadAt: message.createdAt,
    isUnread: false, unreadMarkedAt: null, privateStateVersion: 2, activityAt: message.createdAt,
  }
  const sdk = {
    clientId: 'demo-client',
    connected: true,
    currentUserId: 'convokit_open_maya',
    connectUser: async () => undefined,
    disconnectUser: async () => undefined,
    updatePresence: async () => undefined,
    sendTyping: async () => undefined,
    listInbox: async () => ({ entries: [entry], nextCursor: null }),
    getConversation: async () => ({
      ...room,
      membership: { role: 'READ_WRITE', lastReadAt: message.createdAt, readPosition: entry.readPosition, unreadMarkedAt: null, privateStateVersion: 2 },
    }),
    getMessages: async () => [message, own],
    editMessage: vi.fn(async (messageId: string, input: EditMessageInput) => ({
      ...own, id: messageId, text: input.text, updatedAt: new Date('2026-08-26T11:06:00Z'), revision: input.revision + 1,
    })),
    deleteMessage: vi.fn<(messageId: string) => Promise<void>>(async () => undefined),
    markConversationRead: vi.fn<(conversationId: string, options?: MarkConversationReadOptions) => Promise<void>>(async () => undefined),
    markConversationUnread: vi.fn(async (conversationId: string) => ({
      conversationId, unreadMarkedAt: new Date('2026-08-26T11:05:00Z'), privateStateVersion: 3,
    })),
    clearConversationUnread: vi.fn(),
    realtime: {
      onConnectionEvent: subscription, onPresence: subscription, onInboxChanged: subscription, onInboxActivity: subscription,
      onMessage: subscription, onMessageDeleted: subscription, onReadReceipt: subscription, onTyping: subscription,
    },
  }
  return { sdk }
})
vi.mock('@convokitapp/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@convokitapp/sdk')>()),
  ConvoKitClient: vi.fn(() => fake.sdk as unknown as ConvoKitClient),
}))

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
describe('React live demo', () => {
  it('renders the branded launch flow and links all three demos', () => {
    render(<LiveExample />)
    expect(screen.getByRole('heading', { name: 'Your workspace awaits' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vue' })).toHaveAttribute(
      'href',
      'https://convokit-vue-demo.vercel.app',
    )
    expect(screen.getByText(/open testing workspace/)).toBeInTheDocument()
  })
  it('connects the selected persona through demo orchestration', () => {
    const connect = vi.spyOn(DemoModel.prototype, 'connect').mockResolvedValue()
    render(<LiveExample />)
    fireEvent.click(screen.getByRole('button', { name: 'AR Alex' }))
    fireEvent.click(screen.getByRole('button', { name: 'Launch workspace' }))
    expect(connect).toHaveBeenCalledWith('convokit_open_alex')
  })
  it('marks the open room unread through the published list controller and shows its dot', async () => {
    localStorage.setItem(sessionKey, JSON.stringify({ userId: 'convokit_open_maya', roomId: 'room-1' }))
    render(<LiveExample />)
    // The restored room opens (the message renders in the room and as the row's preview), acknowledges
    // its newest message with the version captured at open, and the row shows no badge: nothing is unread.
    await screen.findByText('Hello Maya', { selector: '.ckui-message-text' })
    await waitFor(() =>
      expect(fake.sdk.markConversationRead).toHaveBeenCalledWith('room-1', { throughMessageId: 'message-1', privateStateVersion: 2 }),
    )
    expect(screen.queryByRole('img', { name: 'Unread' })).toBeNull()
    expect(screen.getByText('UI SDK 0.8.0')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mark unread' }))
    // The action goes through the SDK's /unread route; the package patches the row and renders the
    // numberless dot itself (count 0, never `0 unread`), and the demo closes the room.
    await waitFor(() => expect(fake.sdk.markConversationUnread).toHaveBeenCalledWith('room-1'))
    const dot = await screen.findByRole('img', { name: 'Unread' })
    expect(dot).toHaveClass('ckui-badge--dot')
    expect(dot.closest('[data-unread]')).toHaveTextContent('Launch room')
    expect(screen.queryByRole('img', { name: '0 unread' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'A good conversation starts here' })).toBeInTheDocument()
    expect(screen.getByText('Marked unread · room-1')).toBeInTheDocument()
  })
  it('edits and deletes the own message through the package defaults and the SDK author calls', async () => {
    localStorage.setItem(sessionKey, JSON.stringify({ userId: 'convokit_open_maya', roomId: 'room-1' }))
    render(<LiveExample />)
    await screen.findByText('Morning Alex, launch is a go', { selector: '.ckui-message-text' })
    const row = (id: string) => within(document.querySelector<HTMLElement>(`[data-message-id="${id}"]`)!)
    // The demo passes nothing about editing: the bound `Conversation` wires the controller, so Maya's own
    // confirmed row offers the package's actions and its `Edited` label (revision 1), Alex's row neither.
    expect(row('message-0').getByRole('button', { name: 'Edit message' })).toBeInTheDocument()
    expect(row('message-0').getByRole('button', { name: 'Delete message' })).toBeInTheDocument()
    expect(row('message-0').getByLabelText('Edited')).toHaveClass('ckui-message-edited')
    expect(row('message-1').queryByRole('button', { name: 'Edit message' })).toBeNull()
    expect(row('message-1').queryByLabelText('Edited')).toBeNull()

    fireEvent.click(row('message-0').getByRole('button', { name: 'Edit message' }))
    // Edit mode is store-owned: the composer shows the banner, is prefilled with the snapshot text and saves
    // through the SDK's `/own` route with the SNAPSHOT's revision, never the live row's.
    expect(screen.getByRole('status')).toHaveTextContent('Editing message')
    const field = screen.getByRole('textbox', { name: 'Message' })
    expect(field).toHaveValue('Morning Alex, launch is a go')
    fireEvent.change(field, { target: { value: 'Morning Alex, launch is a go at 10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save message' }))
    await waitFor(() =>
      expect(fake.sdk.editMessage).toHaveBeenCalledWith('message-0', { text: 'Morning Alex, launch is a go at 10:00', revision: 1 }),
    )
    await screen.findByText('Morning Alex, launch is a go at 10:00', { selector: '.ckui-message-text' })
    expect(screen.queryByText('Editing message')).toBeNull()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument()
    expect(row('message-0').getByLabelText('Edited')).toBeInTheDocument()

    // Delete is never optimistic: the inline confirmation sends nothing until `Delete`, then the row goes
    // once the SDK's DELETE resolves.
    fireEvent.click(row('message-0').getByRole('button', { name: 'Delete message' }))
    expect(row('message-0').getByRole('group', { name: 'Delete this message?' })).toBeInTheDocument()
    fireEvent.click(row('message-0').getByRole('button', { name: 'Cancel delete' }))
    expect(fake.sdk.deleteMessage).not.toHaveBeenCalled()
    fireEvent.click(row('message-0').getByRole('button', { name: 'Delete message' }))
    fireEvent.click(row('message-0').getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(fake.sdk.deleteMessage).toHaveBeenCalledWith('message-0'))
    await waitFor(() => expect(document.querySelector('[data-message-id="message-0"]')).toBeNull())
    expect(screen.getByText('Hello Maya', { selector: '.ckui-message-text' })).toBeInTheDocument()
  })
})
