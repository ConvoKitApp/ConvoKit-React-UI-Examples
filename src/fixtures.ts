import type { Conversation, InboxSummary, Message } from '@convokitapp/sdk'

const participants = [
  {
    id: 'participant-maya',
    appUserId: 'maya',
    name: 'Maya Chen',
    imageUrl: null,
    role: 'READ_WRITE',
    lastReadAt: new Date('2026-08-26T11:30:00Z'),
    readPosition: null,
  },
  {
    id: 'participant-alex',
    appUserId: 'alex',
    name: 'Alex Rivera',
    imageUrl: null,
    role: 'READ_WRITE',
    lastReadAt: new Date('2026-08-26T11:30:00Z'),
    readPosition: null,
  },
  {
    id: 'participant-jordan',
    appUserId: 'jordan',
    name: 'Jordan Lee',
    imageUrl: null,
    role: 'READ_WRITE',
    lastReadAt: new Date('2026-08-26T11:28:00Z'),
    readPosition: null,
  },
] satisfies Conversation['participants']

export const conversations: Conversation[] = [
  ['product-launch', 'Product launch', 'Release coordination'],
  ['customer-operations', 'Customer operations', 'Service desk handoff'],
  ['design-review', 'Design review', 'Interface review'],
  ['incident-room', 'Incident room', 'Live response'],
].map(([id, title, description], index) => ({
  id,
  appId: 'demo-app',
  title,
  displayTitle: title,
  description,
  imageUrl: null,
  participants: participants.map((participant) => ({ ...participant })),
  createdAt: new Date(`2026-08-${20 + index}T09:00:00Z`),
  updatedAt: new Date(`2026-08-26T11:${27 - index}:00Z`),
}))

/**
 * The id of a message that was sent, quoted and then deleted. It is deliberately absent from both arrays
 * below: the reply that points at it keeps its reference, and the package renders
 * `Original message unavailable` instead of dropping the quote (core 0.9).
 */
export const removedMessageId = 'message-removed'

/**
 * The room's older history, the rows a newest-first page never reaches. They exist so the showcase can jump
 * to a quoted message that is outside the loaded window: the host answers with a bounded window around it,
 * exactly as `getMessageContext(conversationId, { messageId })` would, and that window REPLACES the loaded
 * one until the viewer comes back to the latest.
 */
export const olderMessages: Message[] = [
  {
    id: 'history-1',
    conversationId: 'product-launch',
    senderId: 'alex',
    text: 'Kicking off the launch thread — plan, owners and dates below.',
    media: [],
    createdAt: new Date('2026-08-26T10:38:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'history-2',
    conversationId: 'product-launch',
    senderId: 'jordan',
    text: 'Here is the rollout plan we agreed in the architecture review.',
    media: [],
    createdAt: new Date('2026-08-26T10:42:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'history-3',
    conversationId: 'product-launch',
    senderId: 'maya',
    text: 'Thanks Jordan. I will fold the copy review into that plan.',
    media: [],
    createdAt: new Date('2026-08-26T10:47:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'history-4',
    conversationId: 'product-launch',
    senderId: 'alex',
    text: 'Staging sign-off is done, so only the checklist is left.',
    media: [],
    createdAt: new Date('2026-08-26T10:53:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'history-5',
    conversationId: 'product-launch',
    senderId: 'jordan',
    text: 'Support already has the escalation path for launch week.',
    media: [],
    createdAt: new Date('2026-08-26T11:01:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'history-6',
    conversationId: 'product-launch',
    senderId: 'maya',
    text: 'Noted. I will link the support case here once it is open.',
    media: [],
    createdAt: new Date('2026-08-26T11:06:00Z'),
    updatedAt: null,
    revision: 0,
  },
]

/**
 * The loaded window: what a newest-first page would hold. Every row carries the core 0.8 `revision` (0 when
 * sent, +1 per author or administrative edit), so Alex's edited first message has `revision: 1` and the
 * package labels it `Edited` from that alone, never from `updatedAt`. Maya's own confirmed rows are the ones
 * she may edit or delete; any of them may be quoted.
 *
 * Three rows carry the core 0.9 `replyToMessageId`, one per render branch of the quoted block: a parent
 * inside this window (resolved from the window itself, no request), a parent in `olderMessages` (resolved by
 * the batched preview call, and a jump loads it), and a parent that was deleted (`removedMessageId`, which
 * keeps the reference and renders `Original message unavailable`).
 */
export const messages: Message[] = [
  {
    id: 'message-1',
    conversationId: 'product-launch',
    senderId: 'alex',
    text: 'The final launch checklist is ready for review.',
    media: [],
    createdAt: new Date('2026-08-26T11:14:00Z'),
    updatedAt: new Date('2026-08-26T11:15:00Z'),
    revision: 1,
  },
  {
    id: 'message-2',
    conversationId: 'product-launch',
    senderId: 'maya',
    text: 'Great. I approved the copy and shared the release notes.',
    media: [
      {
        id: 'image-1',
        type: 'image',
        name: 'launch-board.svg',
        url: '/launch-board.svg',
        size: 186432,
      },
    ],
    createdAt: new Date('2026-08-26T11:19:00Z'),
    updatedAt: null,
    revision: 0,
    replyToMessageId: 'message-1',
  },
  {
    id: 'message-3',
    conversationId: 'product-launch',
    senderId: 'jordan',
    text: 'Attaching the final handoff document.',
    media: [
      {
        id: 'file-1',
        type: 'file',
        name: 'launch-handoff.pdf',
        url: 'https://example.com/launch-handoff.pdf',
        size: 245760,
      },
    ],
    createdAt: new Date('2026-08-26T11:23:00Z'),
    updatedAt: null,
    revision: 0,
    replyToMessageId: 'history-2',
  },
  {
    id: 'message-4',
    conversationId: 'product-launch',
    senderId: 'maya',
    text: 'I linked this conversation to the support case.',
    media: [
      {
        id: 'ticket-contact',
        type: 'contact',
        name: 'Ticket CK-4821',
        metadata: { email: 'Payment verification' },
      },
    ],
    createdAt: new Date('2026-08-26T11:27:00Z'),
    updatedAt: null,
    revision: 0,
    replyToMessageId: removedMessageId,
  },
]

export const readAtByUserId = new Map([
  ['alex', new Date('2026-08-26T11:30:00Z')],
  ['jordan', new Date('2026-08-26T11:28:00Z')],
])

/**
 * What `listInbox` would return for Maya: the newest message, her unread count, activity time and private
 * unread marker per room. Design review has nothing unread but she marked it to come back to, so
 * `isUnread` is true with a count of 0 and the package renders a numberless dot instead of a number.
 */
export const summaries = new Map<string, InboxSummary>([
  [
    'product-launch',
    {
      latestMessage: messages[3]!,
      unreadCount: 0,
      unreadCountCapped: false,
      readPosition: { messageId: 'message-3', createdAt: new Date('2026-08-26T11:23:00Z') },
      lastReadAt: new Date('2026-08-26T11:30:00Z'),
      isUnread: false,
      unreadMarkedAt: null,
      privateStateVersion: 0,
      activityAt: new Date('2026-08-26T11:27:00Z'),
    },
  ],
  [
    'customer-operations',
    {
      latestMessage: {
        id: 'message-5',
        conversationId: 'customer-operations',
        senderId: 'alex',
        text: 'Payment verification is still pending on ticket CK-4821.',
        media: [],
        createdAt: new Date('2026-08-26T11:26:00Z'),
        updatedAt: null,
        revision: 0,
      },
      unreadCount: 2,
      unreadCountCapped: false,
      readPosition: null,
      lastReadAt: new Date('2026-08-26T10:58:00Z'),
      isUnread: true,
      unreadMarkedAt: null,
      privateStateVersion: 0,
      activityAt: new Date('2026-08-26T11:26:00Z'),
    },
  ],
  [
    'design-review',
    {
      latestMessage: {
        id: 'message-6',
        conversationId: 'design-review',
        senderId: 'jordan',
        text: null,
        media: [{ id: 'image-2', type: 'image', name: 'settings-panel.png', url: '/launch-board.svg', size: 90112 }],
        createdAt: new Date('2026-08-26T11:25:00Z'),
        updatedAt: null,
        revision: 0,
      },
      unreadCount: 0,
      unreadCountCapped: false,
      readPosition: { messageId: 'message-6', createdAt: new Date('2026-08-26T11:25:00Z') },
      lastReadAt: new Date('2026-08-26T11:25:30Z'),
      isUnread: true,
      unreadMarkedAt: new Date('2026-08-26T11:29:00Z'),
      privateStateVersion: 1,
      activityAt: new Date('2026-08-26T11:25:00Z'),
    },
  ],
  [
    'incident-room',
    {
      latestMessage: {
        id: 'message-7',
        conversationId: 'incident-room',
        senderId: 'alex',
        text: null,
        media: [{ id: 'file-2', type: 'file', name: 'postmortem-draft.pdf', url: 'https://example.com/postmortem-draft.pdf', size: 512000 }],
        createdAt: new Date('2026-08-26T11:24:00Z'),
        updatedAt: null,
        revision: 0,
      },
      unreadCount: 104,
      unreadCountCapped: false,
      readPosition: null,
      lastReadAt: null,
      isUnread: true,
      unreadMarkedAt: null,
      privateStateVersion: 0,
      activityAt: new Date('2026-08-26T11:24:00Z'),
    },
  ],
])
