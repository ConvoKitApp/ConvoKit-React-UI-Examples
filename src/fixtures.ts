import type { Conversation, Message } from '@convokitapp/sdk'

const participants = [
  {
    id: 'participant-maya',
    appUserId: 'maya',
    name: 'Maya Chen',
    imageUrl: null,
    role: 'READ_WRITE',
    lastReadAt: new Date('2026-08-26T11:30:00Z'),
  },
  {
    id: 'participant-alex',
    appUserId: 'alex',
    name: 'Alex Rivera',
    imageUrl: null,
    role: 'READ_WRITE',
    lastReadAt: new Date('2026-08-26T11:30:00Z'),
  },
  {
    id: 'participant-jordan',
    appUserId: 'jordan',
    name: 'Jordan Lee',
    imageUrl: null,
    role: 'READ_WRITE',
    lastReadAt: new Date('2026-08-26T11:28:00Z'),
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

export const messages: Message[] = [
  {
    id: 'message-1',
    conversationId: 'product-launch',
    senderId: 'alex',
    text: 'The final launch checklist is ready for review.',
    media: [],
    createdAt: new Date('2026-08-26T11:14:00Z'),
    updatedAt: null,
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
  },
]

export const readAtByUserId = new Map([
  ['alex', new Date('2026-08-26T11:30:00Z')],
  ['jordan', new Date('2026-08-26T11:28:00Z')],
])
