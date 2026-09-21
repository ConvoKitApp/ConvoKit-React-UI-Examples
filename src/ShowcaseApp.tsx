import type { Message, MessageMedia } from '@convokitapp/sdk'
import {
  ConversationListView,
  ConversationView,
  ConvoKitThemeProvider,
  inboxPreviewText,
  isConvoKitPendingMessage,
  type ComposerRenderProps,
  type ConversationItemRenderProps,
  type MessageRenderProps,
} from '@convokitapp/react-ui'
import { ArrowLeft, Bot, Check, CheckCheck, Circle, Headphones, Paperclip, Pencil, Send, Ticket, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { conversations, messages, readAtByUserId, summaries } from './fixtures'

export type Variant = 'standard' | 'branded' | 'compact'

const variants: Array<{ id: Variant; label: string }> = [
  { id: 'standard', label: 'Standard' },
  { id: 'branded', label: 'Branded support' },
  { id: 'compact', label: 'Compact operations' },
]

const details = {
  standard: {
    number: '1',
    title: 'Standard components',
    description: 'Neutral, shadcn-inspired defaults for lists, previews, unread badges, messages, own-message edit and delete actions, receipts, media and the composer.',
    props: ['summaries', 'currentUserId', 'onRefresh', 'onAddAttachment', 'readAtByUserId', 'editingMessage', 'onEditMessage', 'onSaveEdit', 'onDeleteMessage', 'reverseMessages: true'],
  },
  branded: {
    number: '2',
    title: 'Branded customer support',
    description: 'A product-branded support workspace built from the same headless render hooks.',
    props: ['renderConversationItem', 'renderHeader', 'renderMedia', 'renderReadReceipt', 'renderComposer', 'editing'],
  },
  compact: {
    number: '3',
    title: 'Compact operations view',
    description: 'A restrained data-dense treatment for web dashboards with limited space.',
    props: ['density: compact', 'renderConversationItem', 'renderMessage', 'renderTypingIndicator', 'confirmDelete', 'stickToBottom: false'],
  },
} satisfies Record<Variant, { number: string; title: string; description: string; props: string[] }>

function variantFromUrl(): Variant {
  const value = new URLSearchParams(window.location.search).get('variant')
  return variants.some((variant) => variant.id === value) ? (value as Variant) : 'standard'
}

/**
 * The offline stand-in for the shared room on a 0.8 backend: the fixture history and the edit-mode snapshot
 * the controlled `ConversationView` is a pure function of. Saving replaces the text and bumps that row's
 * `revision` (an emptied caption is stored as null; the `Edited` label follows the revision, never
 * `updatedAt`); deleting removes the row for every member, and the inbox preview follows the newest
 * surviving row as `listInbox` would. Nothing here re-implements the package's conflict handling: with the
 * SDK-backed `Conversation` the controller owns `editingMessage`, sends the snapshot's revision and reloads
 * the row on a 409 itself.
 */
function useShowcaseRoom() {
  const [history, setHistory] = useState(messages)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const inbox = useMemo(() => {
    const launch = summaries.get('product-launch')!
    return new Map(summaries).set('product-launch', { ...launch, latestMessage: history.at(-1) ?? null })
  }, [history])
  return {
    history,
    inbox,
    editingMessage,
    edit: setEditingMessage,
    cancel: () => setEditingMessage(null),
    save: (message: Message, text: string) => {
      setHistory((rows) => rows.map((row) => (
        row.id === message.id ? { ...row, text: text || null, updatedAt: new Date(), revision: row.revision + 1 } : row
      )))
      setEditingMessage(null)
      return true
    },
    remove: (message: Message) => {
      setHistory((rows) => rows.filter((row) => row.id !== message.id))
      setEditingMessage((current) => (current?.id === message.id ? null : current))
    },
  }
}

type ShowcaseRoom = ReturnType<typeof useShowcaseRoom>

export function ShowcaseApp() {
  const [variant, setVariant] = useState<Variant>(variantFromUrl)
  const room = useShowcaseRoom()
  const detail = details[variant]
  const theme = variant === 'branded'
    ? {
        primary: '#6d45a8',
        background: '#fbfaff',
        border: '#e5dff0',
        outgoingBubble: '#6d45a8',
      }
    : {}

  const chooseVariant = (next: Variant) => {
    setVariant(next)
    const url = new URL(window.location.href)
    url.searchParams.set('variant', next)
    window.history.replaceState({}, '', url)
  }

  return (
    <ConvoKitThemeProvider theme={theme}>
      <main className={`showcase showcase--${variant}`} data-variant={variant}>
        <header className="showcase__header">
          <div className="brand">
            <span className="brand__mark"><Bot aria-hidden="true" /></span>
            <span><strong>ConvoKit React UI</strong><small>Web-native components, configured with props and render functions</small></span>
          </div>
          <nav className="variant-tabs" aria-label="Component configuration">
            {variants.map((item) => (
              <button key={item.id} type="button" data-active={item.id === variant || undefined} onClick={() => chooseVariant(item.id)}>
                {item.id === variant ? <CheckCheck aria-hidden="true" size={15} /> : null}{item.label}
              </button>
            ))}
          </nav>
        </header>

        <section className="showcase__intro">
          <div><h1>{detail.number} · {detail.title}</h1><p>{detail.description}</p></div>
          <div className="prop-badges">{detail.props.map((prop) => <code key={prop}>{prop}</code>)}</div>
        </section>

        <section className="component-grid">
          <article className="component-card component-card--list">
            <div className="component-label">Conversation list</div>
            <ConversationPanel variant={variant} room={room} />
          </article>
          <article className="component-card component-card--chat">
            <div className="component-label">Chat view</div>
            <ConversationPanel variant={variant} room={room} chat />
          </article>
        </section>
      </main>
    </ConvoKitThemeProvider>
  )
}

function ConversationPanel({ variant, room, chat = false }: { variant: Variant; room: ShowcaseRoom; chat?: boolean }) {
  const selected = conversations[0]!
  const typing = useMemo(() => new Set(variant === 'standard' ? [] : ['alex']), [variant])
  if (!chat) {
    return (
      <ConversationListView
        conversations={conversations}
        summaries={room.inbox}
        currentUserId="maya"
        selectedConversationId={selected.id}
        onConversationSelect={() => undefined}
        density={variant === 'compact' ? 'compact' : 'comfortable'}
        {...(variant === 'branded' ? { renderConversationItem: BrandedConversationRow } : {})}
        {...(variant === 'compact' ? { renderConversationItem: CompactConversationRow } : {})}
      />
    )
  }

  // Edit mode is a pure function of `editingMessage` plus the callbacks (0.8): the package decides which rows
  // are eligible (Maya's own confirmed rows), renders their actions and the composer's edit banner, and routes
  // the single `send` path through `onSaveEdit` while editing. Standard and branded keep the package's inline
  // `Delete this message?` confirmation; compact hands confirmation to the host through `confirmDelete`.
  return (
    <ConversationView
      conversation={selected}
      messages={room.history}
      currentUserId="maya"
      readAtByUserId={readAtByUserId}
      typingUserIds={typing}
      onSendMessage={() => true}
      onRefresh={() => undefined}
      onAddAttachment={() => undefined}
      editingMessage={room.editingMessage}
      onEditMessage={room.edit}
      onSaveEdit={room.save}
      onCancelEdit={room.cancel}
      onDeleteMessage={room.remove}
      formatTime={(date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      density={variant === 'compact' ? 'compact' : 'comfortable'}
      reverseMessages={variant !== 'compact'}
      stickToBottom={variant !== 'compact'}
      {...(variant === 'branded' ? {
        renderHeader: BrandedHeader,
        renderMedia: BrandedMedia,
        renderReadReceipt: ({ readerIds }) => <span className="branded-receipt"><CheckCheck size={12} /> Read by {readerIds.size ? 'Alex Rivera' : 'nobody yet'}</span>,
        renderComposer: BrandedComposer,
      } : {})}
      {...(variant === 'compact' ? {
        renderHeader: CompactHeader,
        renderMessage: CompactMessage,
        renderTypingIndicator: () => <div className="compact-typing">Jordan Lee is responding…</div>,
        renderComposer: CompactComposer,
        confirmDelete: (message: Message) => window.confirm(`Delete "${message.text ?? 'this message'}"?`),
      } : {})}
    />
  )
}

/**
 * Unread badge from a real `InboxSummary`; null when nothing is unread. Mirrors the package's default badge:
 * the visible label overflows to 99+, while the accessible name keeps the exact count unless the server capped it.
 * A room the viewer marked unread with nothing actually unread (`isUnread` with a count of 0, not capped)
 * gets a numberless dot named `Unread`, never `0 unread` or an invented count.
 */
function unreadBadge(summary: ConversationItemRenderProps['summary']) {
  if (!summary) return null
  if (summary.unreadCount <= 0 && !summary.unreadCountCapped) {
    return summary.isUnread ? { label: '', name: 'Unread', dot: true } : null
  }
  const overflow = summary.unreadCount > 99 || summary.unreadCountCapped
  return {
    label: overflow ? '99+' : String(summary.unreadCount),
    name: summary.unreadCountCapped ? '99+ unread' : `${summary.unreadCount} unread`,
    dot: false,
  }
}

function BrandedConversationRow({ conversation, selected, onSelect, summary, currentUserId }: ConversationItemRenderProps) {
  const unread = unreadBadge(summary)
  return (
    <button type="button" className="branded-row" data-selected={selected || undefined} onClick={onSelect}>
      <span className="branded-row__avatar">{conversation.displayTitle[0]}</span>
      <span><strong>{conversation.displayTitle}</strong><small>{(summary && inboxPreviewText(summary, conversation, currentUserId)) || conversation.description}</small></span>
      {unread?.dot ? <i className="branded-row__dot" role="img" aria-label={unread.name} /> : unread ? <b aria-label={unread.name}>{unread.label}</b> : null}
    </button>
  )
}

function CompactConversationRow({ conversation, onSelect, summary, currentUserId }: ConversationItemRenderProps) {
  const unread = unreadBadge(summary)
  return (
    <button type="button" className="compact-row" onClick={onSelect}>
      <span>{conversation.displayTitle[0]}</span>
      <span><strong>{conversation.displayTitle}</strong><small>{(summary && inboxPreviewText(summary, conversation, currentUserId)) || conversation.description}</small></span>
      {unread ? <Circle fill="currentColor" size={7} role="img" aria-label={unread.name} /> : null}
    </button>
  )
}

function BrandedHeader({ conversation }: { conversation: (typeof conversations)[number] }) {
  return <header className="branded-header"><span><Headphones /></span><div><strong>{conversation.displayTitle}</strong><small>Priority support · SLA 18 min</small></div><Users size={19} /></header>
}

function BrandedMedia({ media }: { media: MessageMedia }) {
  if (media.type !== 'contact') return undefined
  return <div className="ticket-card"><Ticket /><span><strong>{media.name}</strong><small>{media.metadata.email}</small></span><button type="button">Open</button></div>
}

/**
 * Custom composers receive `editing` while a message is being edited (0.8): the snapshot for a banner and a
 * `cancel` that restores the stashed draft. The same `send` saves while editing and sends otherwise, so the
 * button only changes its label; author edits change text only, so the attach button is hidden meanwhile.
 */
function BrandedComposer({ value, setValue, send, addAttachment, editing }: ComposerRenderProps) {
  return (
    <>
      {editing ? <div className="branded-editing" role="status"><strong>Editing message</strong><span>{editing.message.text}</span><button type="button" onClick={editing.cancel} aria-label="Cancel editing">Cancel</button></div> : null}
      <div className="branded-composer">
        {editing ? null : <button type="button" onClick={addAttachment} aria-label="Attach"><Paperclip /></button>}
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={editing ? 'Edit your reply…' : 'Reply to customer…'} />
        <button type="button" onClick={send}>{editing ? 'Save' : 'Send'}</button>
      </div>
    </>
  )
}

function CompactHeader({ conversation }: { conversation: (typeof conversations)[number] }) {
  return <header className="compact-header"><ArrowLeft /><strong>{conversation.displayTitle}</strong><span>Live</span></header>
}

/**
 * Custom rows receive `isEdited` (`revision > 0`, never `updatedAt`) and, exactly when the viewer may act on
 * the row, `edit` and `remove` (0.8). `remove` asks the view's `confirmDelete` first, so this row needs no
 * confirmation UI of its own.
 */
function CompactMessage({ message, sender, isCurrentUser, isEdited, edit, remove }: MessageRenderProps) {
  const status = isConvoKitPendingMessage(message)
    ? 'Sending…'
    : message.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="compact-message">
      <strong>{isCurrentUser ? 'You' : sender?.name.split(' ')[0]}</strong>
      <span>{message.text}</span>
      <span className="compact-message__meta"><time>{status}</time>{isEdited ? <em aria-label="Edited">Edited</em> : null}</span>
      {edit || remove ? (
        <span className="compact-message__actions">
          {edit ? <button type="button" onClick={edit} aria-label="Edit message"><Pencil /></button> : null}
          {remove ? <button type="button" onClick={() => void remove()} aria-label="Delete message"><Trash2 /></button> : null}
        </span>
      ) : null}
    </div>
  )
}

function CompactComposer({ value, setValue, send, editing }: ComposerRenderProps) {
  return (
    <>
      {editing ? <div className="compact-editing" role="status"><strong>Editing</strong><span>{editing.message.text}</span><button type="button" onClick={editing.cancel} aria-label="Cancel editing">Cancel</button></div> : null}
      <div className="compact-composer">
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={editing ? 'Edit message' : 'Message'} />
        <button type="button" onClick={send} aria-label={editing ? 'Save' : 'Send'}>{editing ? <Check /> : <Send />}</button>
      </div>
    </>
  )
}
