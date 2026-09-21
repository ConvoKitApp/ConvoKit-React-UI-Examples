import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Conversation, ConvoKitClient, InboxEntry, MarkConversationReadOptions, Message } from '@convokitapp/sdk'
import { LiveExample } from './LiveExample'
import { DemoModel, sessionKey } from './demo'

/**
 * A connected 0.7 SDK as the published UI package sees it: one room with nothing unread, its membership
 * served to the caller, and the `/unread` mark answering with the marker and the bumped version.
 */
const fake = vi.hoisted(() => {
  const subscription = () => ({ closed: false, unsubscribe: async () => undefined })
  const room: Conversation = {
    id: 'room-1', appId: 'demo-app', title: 'Launch room', displayTitle: 'Launch room', description: null, imageUrl: null,
    participants: [], createdAt: new Date('2026-08-26T09:00:00Z'), updatedAt: new Date('2026-08-26T11:00:00Z'),
  }
  const message: Message = {
    id: 'message-1', conversationId: 'room-1', senderId: 'convokit_open_alex', text: 'Hello Maya', media: [],
    createdAt: new Date('2026-08-26T11:00:00Z'), updatedAt: null,
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
    getMessages: async () => [message],
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
    expect(screen.getByText('UI SDK 0.7.0')).toBeInTheDocument()

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
})
