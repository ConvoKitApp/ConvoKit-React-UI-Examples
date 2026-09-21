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
 * Every row carries the core 0.8 `revision`: 0 when sent, +1 per author or administrative edit. Alex edited
 * the first message once, so its `revision` is 1 and the package labels it `Edited` from that alone (never
 * from `updatedAt`); the others are unedited. Maya's own confirmed rows are the ones she may edit or delete.
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
