import type { Message, MessageMedia, ReplyPreview } from '@convokitapp/sdk'
import {
  ConversationListView,
  ConversationView,
  ConvoKitThemeProvider,
  inboxPreviewText,
  isConvoKitPendingMessage,
  type ComposerRenderProps,
  type ConversationItemRenderProps,
  type MessageRenderProps,
  type ReplyPreviewState,
} from '@convokitapp/react-ui'
import { ArrowLeft, Bot, Check, CheckCheck, Circle, CornerUpLeft, Headphones, Paperclip, Pencil, Reply, Send, Ticket, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { conversations, messages, olderMessages, readAtByUserId, summaries } from './fixtures'

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
    description: 'Neutral, shadcn-inspired defaults for lists, previews, unread badges, messages, own-message edit and delete actions, quoted replies with jump-to-message, receipts, media and the composer.',
    props: ['summaries', 'currentUserId', 'onRefresh', 'onAddAttachment', 'readAtByUserId', 'editingMessage', 'onEditMessage', 'onSaveEdit', 'onDeleteMessage', 'replyTarget', 'onReplyToMessage', 'replyPreviewByMessageId', 'onJumpToMessage', 'highlightedMessageId', 'hasNewerMessages', 'onReturnToLatest', 'reverseMessages: true'],
  },
  branded: {
    number: '2',
    title: 'Branded customer support',
    description: 'A product-branded support workspace built from the same headless render hooks.',
    props: ['renderConversationItem', 'renderHeader', 'renderMedia', 'renderReadReceipt', 'renderComposer', 'editing', 'replying'],
  },
  compact: {
    number: '3',
    title: 'Compact operations view',
    description: 'A restrained data-dense treatment for web dashboards with limited space.',
    props: ['density: compact', 'renderConversationItem', 'renderMessage', 'renderTypingIndicator', 'confirmDelete', 'canReply', 'reply', 'replyPreview', 'jumpToReplyTarget', 'stickToBottom: false'],
  },
} satisfies Record<Variant, { number: string; title: string; description: string; props: string[] }>

function variantFromUrl(): Variant {
  const value = new URLSearchParams(window.location.search).get('variant')
  return variants.some((variant) => variant.id === value) ? (value as Variant) : 'standard'
}

/**
 * How many rows a jumped window carries: the fixture stand-in for `getMessageContext`'s `limit`
 * (1..100, 30 by default). The showcase room is deliberately small, so its windows are too.
 */
const contextLimit = 4

/** Everything from here on is the loaded window; older rows are only reachable through a jump. */
const liveWindowFrom = messages[0]!.createdAt

const participantNames = new Map(conversations[0]!.participants.map((participant) => [participant.appUserId, participant.name]))
const nameFor = (userId: string) => participantNames.get(userId) ?? userId

/**
 * What one batched `getReplyPreviews` call returns for a quoted parent (core 0.9): the first 500 characters,
 * whether the text was cut, and the attachment COUNT. The attachments themselves are never carried, and the
 * preview is never stored on the reply — it is re-read, so an edit of the parent shows up in the quote.
 */
function replyPreviewOf(message: Message): ReplyPreview {
  const text = message.text
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    text: text === null ? null : text.slice(0, 500),
    textTruncated: (text?.length ?? 0) > 500,
    createdAt: message.createdAt,
    revision: message.revision,
    mediaCount: message.media.length,
  }
}

/**
 * A demo-side delay that never outlives the panel. The showcase stands in for a room controller that owns its
 * own timers and clears them when the room closes, so every deferral here is cancelled on unmount.
 */
function useDeferred() {
  const timers = useRef(new Set<number>())
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
      pending.clear()
    }
  }, [])
  return useCallback((ms: number) => new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer)
      resolve()
    }, ms)
    timers.current.add(timer)
  }), [])
}

/**
 * The offline stand-in for the shared room on a 0.9 backend: the fixture history plus the edit-mode, reply
 * and jump state the controlled `ConversationView` is a pure function of. Saving replaces the text and bumps
 * that row's `revision` (an emptied caption is stored as null; the `Edited` label follows the revision, never
 * `updatedAt`); deleting removes the row for every member, and the inbox preview follows the newest surviving
 * row as `listInbox` would. Replying stamps `replyToMessageId` on the sent row and omits the key entirely
 * otherwise; quoted parents are resolved in ONE batch for the rows on screen and a parent that is no longer in
 * the room resolves to the terminal `'unavailable'`, so the reply keeps its reference. Jumping to a row
 * outside the window replaces the window with a bounded one around the target, exactly as
 * `getMessageContext(conversationId, { messageId })` does, until the viewer comes back to the latest.
 *
 * Nothing here re-implements the package's own bookkeeping: with the SDK-backed `Conversation` the controller
 * owns `editingMessage`, `replyTarget`, `replyPreviews` and `windowMode`, batches the preview call, defers
 * live inserts while jumped and reloads the newest page itself.
 */
function useShowcaseRoom() {
  const [room, setRoom] = useState<Message[]>(() => [...olderMessages, ...messages])
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [replyTarget, setReplyTarget] = useState<Message | null>(null)
  // A jumped window is held as its anchor plus its size, so an edit, a delete or a send cannot shift it.
  const [jumpedAnchorId, setJumpedAnchorId] = useState<string | null>(null)
  const [windowSize, setWindowSize] = useState(contextLimit)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [jumpInFlight, setJumpInFlight] = useState(false)
  const [isLoadingNewer, setIsLoadingNewer] = useState(false)
  const sent = useRef(0)
  const after = useDeferred()

  const view = useMemo(() => {
    const anchor = jumpedAnchorId === null ? -1 : room.findIndex((row) => row.id === jumpedAnchorId)
    if (anchor < 0) {
      return { rows: room.filter((row) => row.createdAt >= liveWindowFrom), newerCount: 0 }
    }
    const start = Math.max(0, anchor - Math.floor(contextLimit / 2))
    return { rows: room.slice(start, start + windowSize), newerCount: Math.max(0, room.length - start - windowSize) }
  }, [jumpedAnchorId, room, windowSize])
  const history = view.rows

  /**
   * One resolution per distinct quoted parent of the rows on screen — never one per row. Parents inside the
   * window would cost no request at all; the rest are what the batched call answers, and an id the room no
   * longer holds is the terminal `'unavailable'`, not a missing key.
   */
  const replyPreviews = useMemo(() => {
    const resolved = new Map<string, ReplyPreviewState>()
    for (const row of history) {
      const parentId = row.replyToMessageId
      if (parentId === undefined || resolved.has(parentId)) continue
      const parent = room.find((candidate) => candidate.id === parentId)
      resolved.set(parentId, parent ? replyPreviewOf(parent) : 'unavailable')
    }
    return resolved
  }, [history, room])

  const inbox = useMemo(() => {
    const launch = summaries.get('product-launch')!
    return new Map(summaries).set('product-launch', { ...launch, latestMessage: room.at(-1) ?? null })
  }, [room])

  const returnToLatest = () => {
    setJumpedAnchorId(null)
    setWindowSize(contextLimit)
  }

  /**
   * Arm the scroll guard and the highlight together. The guard goes up BEFORE the window changes, because
   * shrinking the rendered set clamps the scroll position and emits its own event, and it comes down on a
   * timer rather than on "the first scroll event" — a target already in view never produces one. The
   * highlight's fade runs once the guard clears, and the target is released with it.
   */
  const beginJump = (messageId: string) => {
    setJumpInFlight(true)
    setHighlightedMessageId(messageId)
    void after(150)
      .then(() => {
        setJumpInFlight(false)
        return after(2000)
      })
      .then(() => setHighlightedMessageId((current) => (current === messageId ? null : current)))
  }

  return {
    history,
    inbox,
    editingMessage,
    replyTarget,
    replyPreviews,
    highlightedMessageId,
    jumpInFlight,
    isLoadingNewer,
    hasNewerMessages: jumpedAnchorId !== null,
    // Editing and replying are mutually exclusive: entering one leaves the other.
    edit: (message: Message) => {
      setReplyTarget(null)
      setEditingMessage(message)
    },
    cancel: () => setEditingMessage(null),
    save: (message: Message, text: string) => {
      setRoom((rows) => rows.map((row) => (
        row.id === message.id ? { ...row, text: text || null, updatedAt: new Date(), revision: row.revision + 1 } : row
      )))
      setEditingMessage(null)
      return true
    },
    remove: (message: Message) => {
      setRoom((rows) => rows.filter((row) => row.id !== message.id))
      setEditingMessage((current) => (current?.id === message.id ? null : current))
      setReplyTarget((current) => (current?.id === message.id ? null : current))
    },
    reply: (message: Message) => {
      setEditingMessage(null)
      setReplyTarget(message)
    },
    cancelReply: () => setReplyTarget(null),
    send: (text: string) => {
      // A send belongs to the live tail: leave a jumped window first, then append. The quote survives the
      // switch, and `replyToMessageId` is omitted entirely when nothing is being quoted.
      returnToLatest()
      sent.current += 1
      const quoted = replyTarget
      setRoom((rows) => [...rows, {
        id: `message-sent-${sent.current}`,
        conversationId: 'product-launch',
        senderId: 'maya',
        text,
        media: [],
        createdAt: new Date(),
        updatedAt: null,
        revision: 0,
        ...(quoted ? { replyToMessageId: quoted.id } : {}),
      }])
      setReplyTarget(null)
      return true
    },
    jump: (messageId: string) => {
      const inWindow = history.some((row) => row.id === messageId)
      // Gone for good: the quote stays `unavailable` and nothing is surfaced as an error, which is how the
      // package treats the coded `MESSAGE_NOT_FOUND` a deleted parent answers with.
      if (!inWindow && !room.some((row) => row.id === messageId)) return
      beginJump(messageId)
      // A row already on screen is only centred, focused and highlighted: no window change, no request.
      if (inWindow) return
      setJumpedAnchorId(messageId)
      setWindowSize(contextLimit)
    },
    // A user-initiated scroll drops the highlight; the package never calls this while the guard is up.
    clearHighlight: () => { if (!jumpInFlight) setHighlightedMessageId(null) },
    loadNewer: async () => {
      if (jumpedAnchorId === null || isLoadingNewer) return
      setIsLoadingNewer(true)
      await after(120)
      setIsLoadingNewer(false)
      // Reaching the live tail is never an in-place flip: the window is dropped and the newest page reloaded.
      if (view.newerCount <= contextLimit) returnToLatest()
      else setWindowSize((size) => size + contextLimit)
    },
    returnToLatest,
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
  //
  // Replying and jumping are the same kind of surface (0.9), and they are host-owned here: `replyTarget` drives
  // the composer strip, `onReplyToMessage` puts `Reply to message` on every confirmed row a writer may quote,
  // `replyPreviewByMessageId` resolves the quoted parents, and `onJumpToMessage` makes each quote activatable.
  // `jumpInFlight` is the guard the view reads to suppress stick-to-bottom, both pagination triggers and the
  // highlight clear while a jump lands, and `hasNewerMessages` / `onLoadNewer` / `onReturnToLatest` are the way
  // back out of a jumped window. Leave any of them out and the row and composer markup is exactly 0.8's.
  return (
    <ConversationView
      conversation={selected}
      messages={room.history}
      currentUserId="maya"
      readAtByUserId={readAtByUserId}
      typingUserIds={typing}
      onSendMessage={room.send}
      onRefresh={() => undefined}
      onAddAttachment={() => undefined}
      editingMessage={room.editingMessage}
      onEditMessage={room.edit}
      onSaveEdit={room.save}
      onCancelEdit={room.cancel}
      onDeleteMessage={room.remove}
      replyTarget={room.replyTarget}
      onReplyToMessage={room.reply}
      onCancelReply={room.cancelReply}
      replyPreviewByMessageId={room.replyPreviews}
      onJumpToMessage={room.jump}
      highlightedMessageId={room.highlightedMessageId}
      jumpInFlight={room.jumpInFlight}
      onClearHighlight={room.clearHighlight}
      hasNewerMessages={room.hasNewerMessages}
      isLoadingNewer={room.isLoadingNewer}
      onLoadNewer={room.loadNewer}
      onReturnToLatest={room.returnToLatest}
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
 * Custom composers receive `editing` while a message is being edited (0.8) and `replying` while one is being
 * quoted (0.9), each with its snapshot and a `cancel`. The two are mutually exclusive. Cancelling a reply
 * leaves the field alone — quoting adds context to what is being typed rather than replacing it, so unlike
 * edit mode nothing is stashed or restored. The same `send` saves, replies and sends, so the button only
 * changes its label; author edits change text only, so the attach button is hidden meanwhile.
 */
function BrandedComposer({ value, setValue, send, addAttachment, editing, replying }: ComposerRenderProps) {
  return (
    <>
      {editing ? <div className="branded-editing" role="status"><strong>Editing message</strong><span>{editing.message.text}</span><button type="button" onClick={editing.cancel} aria-label="Cancel editing">Cancel</button></div> : null}
      {replying ? <div className="branded-replying" role="status"><strong>Replying to {nameFor(replying.message.senderId)}</strong><span>{replying.message.text}</span><button type="button" onClick={replying.cancel} aria-label="Cancel reply">Cancel</button></div> : null}
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
 * The quoted parent as a custom row receives it (0.9), with all three branches: a resolved `ReplyPreview`, the
 * terminal `'unavailable'` once the original is gone, and `undefined` while it is still unresolved — which
 * renders the reference with no quoted text, never the unavailable wording. `jumpToReplyTarget` is present
 * exactly when the row quotes something and the view can jump, so the quote is inert without it.
 */
function CompactQuote({ preview, jumpToReplyTarget }: { preview?: ReplyPreviewState; jumpToReplyTarget?: () => void }) {
  const resolved = preview === undefined || preview === 'unavailable' ? null : preview
  const label = preview === 'unavailable'
    ? 'Original message unavailable'
    : resolved
    ? `${nameFor(resolved.senderId)}: ${resolved.text ?? `${resolved.mediaCount} attachment${resolved.mediaCount === 1 ? '' : 's'}`}`
    : ''
  if (!jumpToReplyTarget) return <span className="compact-message__quote">{label}</span>
  return (
    <button type="button" className="compact-message__quote" onClick={jumpToReplyTarget} aria-label="Go to quoted message">
      <CornerUpLeft />{label}
    </button>
  )
}

/**
 * Custom rows receive `isEdited` (`revision > 0`, never `updatedAt`) and, exactly when the viewer may act on
 * the row, `edit` and `remove` (0.8). `remove` asks the view's `confirmDelete` first, so this row needs no
 * confirmation UI of its own. Since 0.9 they also receive the flat reply members: `canReply` with a matching
 * `reply` on every confirmed row a writer may quote (any member may quote any row, so unlike `canEdit` it is
 * not limited to the viewer's own), plus `replyPreview` and `jumpToReplyTarget` on rows that quote something.
 */
function CompactMessage({ message, sender, isCurrentUser, isEdited, edit, remove, canReply, reply, replyPreview, jumpToReplyTarget }: MessageRenderProps) {
  const status = isConvoKitPendingMessage(message)
    ? 'Sending…'
    : message.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="compact-message">
      <strong>{isCurrentUser ? 'You' : sender?.name.split(' ')[0]}</strong>
      <span className="compact-message__body">
        {message.replyToMessageId ? (
          <CompactQuote
            {...(replyPreview === undefined ? {} : { preview: replyPreview })}
            {...(jumpToReplyTarget ? { jumpToReplyTarget } : {})}
          />
        ) : null}
        <span>{message.text}</span>
      </span>
      <span className="compact-message__meta"><time>{status}</time>{isEdited ? <em aria-label="Edited">Edited</em> : null}</span>
      {canReply || edit || remove ? (
        <span className="compact-message__actions">
          {/* `reply` is present exactly when `canReply`, the way `edit` is present exactly when `canEdit`. */}
          {reply ? <button type="button" onClick={reply} aria-label="Reply to message"><Reply /></button> : null}
          {edit ? <button type="button" onClick={edit} aria-label="Edit message"><Pencil /></button> : null}
          {remove ? <button type="button" onClick={() => void remove()} aria-label="Delete message"><Trash2 /></button> : null}
        </span>
      ) : null}
    </div>
  )
}

function CompactComposer({ value, setValue, send, editing, replying }: ComposerRenderProps) {
  return (
    <>
      {editing ? <div className="compact-editing" role="status"><strong>Editing</strong><span>{editing.message.text}</span><button type="button" onClick={editing.cancel} aria-label="Cancel editing">Cancel</button></div> : null}
      {replying ? <div className="compact-replying" role="status"><strong>Replying</strong><span>{replying.message.text}</span><button type="button" onClick={replying.cancel} aria-label="Cancel reply">Cancel</button></div> : null}
      <div className="compact-composer">
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={editing ? 'Edit message' : 'Message'} />
        <button type="button" onClick={send} aria-label={editing ? 'Save' : 'Send'}>{editing ? <Check /> : <Send />}</button>
      </div>
    </>
  )
}
