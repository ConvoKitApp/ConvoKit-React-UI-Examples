import type { MessageMedia } from '@convokitapp/sdk'
import {
  ConversationListView,
  ConversationView,
  ConvoKitThemeProvider,
  isConvoKitPendingMessage,
  type ComposerRenderProps,
  type MessageRenderProps,
} from '@convokitapp/react-ui'
import { ArrowLeft, Bot, CheckCheck, Circle, Headphones, Paperclip, Send, Ticket, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { conversations, messages, readAtByUserId } from './fixtures'

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
    description: 'Neutral, shadcn-inspired defaults for lists, messages, receipts, media and the composer.',
    props: ['onRefresh', 'onAddAttachment', 'readAtByUserId', 'reverseMessages: true'],
  },
  branded: {
    number: '2',
    title: 'Branded customer support',
    description: 'A product-branded support workspace built from the same headless render hooks.',
    props: ['renderConversationItem', 'renderHeader', 'renderMedia', 'renderReadReceipt', 'renderComposer'],
  },
  compact: {
    number: '3',
    title: 'Compact operations view',
    description: 'A restrained data-dense treatment for web dashboards with limited space.',
    props: ['density: compact', 'renderConversationItem', 'renderMessage', 'renderTypingIndicator', 'stickToBottom: false'],
  },
} satisfies Record<Variant, { number: string; title: string; description: string; props: string[] }>

function variantFromUrl(): Variant {
  const value = new URLSearchParams(window.location.search).get('variant')
  return variants.some((variant) => variant.id === value) ? (value as Variant) : 'standard'
}

export function ShowcaseApp() {
  const [variant, setVariant] = useState<Variant>(variantFromUrl)
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
            <ConversationPanel variant={variant} />
          </article>
          <article className="component-card component-card--chat">
            <div className="component-label">Chat view</div>
            <ConversationPanel variant={variant} chat />
          </article>
        </section>
      </main>
    </ConvoKitThemeProvider>
  )
}

function ConversationPanel({ variant, chat = false }: { variant: Variant; chat?: boolean }) {
  const selected = conversations[0]!
  const typing = useMemo(() => new Set(variant === 'standard' ? [] : ['alex']), [variant])
  if (!chat) {
    return (
      <ConversationListView
        conversations={conversations}
        selectedConversationId={selected.id}
        onConversationSelect={() => undefined}
        density={variant === 'compact' ? 'compact' : 'comfortable'}
        {...(variant === 'branded' ? { renderConversationItem: BrandedConversationRow } : {})}
        {...(variant === 'compact' ? { renderConversationItem: CompactConversationRow } : {})}
      />
    )
  }

  return (
    <ConversationView
      conversation={selected}
      messages={messages}
      currentUserId="maya"
      readAtByUserId={readAtByUserId}
      typingUserIds={typing}
      onSendMessage={() => true}
      onRefresh={() => undefined}
      onAddAttachment={() => undefined}
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
      } : {})}
    />
  )
}

function BrandedConversationRow({ conversation, index, selected, onSelect }: Parameters<NonNullable<React.ComponentProps<typeof ConversationListView>['renderConversationItem']>>[0]) {
  return (
    <button type="button" className="branded-row" data-selected={selected || undefined} onClick={onSelect}>
      <span className="branded-row__avatar">{conversation.displayTitle[0]}</span>
      <span><strong>{conversation.displayTitle}</strong><small>{index === 0 ? 'Waiting for your reply' : 'Last reply today'}</small></span>
      {index === 0 ? <b>2</b> : null}
    </button>
  )
}

function CompactConversationRow({ conversation, selected, onSelect }: Parameters<NonNullable<React.ComponentProps<typeof ConversationListView>['renderConversationItem']>>[0]) {
  return (
    <button type="button" className="compact-row" onClick={onSelect}>
      <span>{conversation.displayTitle[0]}</span><strong>{conversation.displayTitle}</strong>{selected ? <Circle fill="currentColor" size={7} /> : null}
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

function BrandedComposer({ value, setValue, send, addAttachment }: ComposerRenderProps) {
  return <div className="branded-composer"><button type="button" onClick={addAttachment} aria-label="Attach"><Paperclip /></button><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Reply to customer…" /><button type="button" onClick={send}>Send</button></div>
}

function CompactHeader({ conversation }: { conversation: (typeof conversations)[number] }) {
  return <header className="compact-header"><ArrowLeft /><strong>{conversation.displayTitle}</strong><span>Live</span></header>
}

function CompactMessage({ message, sender, isCurrentUser }: MessageRenderProps) {
  const status = isConvoKitPendingMessage(message)
    ? 'Sending…'
    : message.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return <div className="compact-message"><strong>{isCurrentUser ? 'You' : sender?.name.split(' ')[0]}</strong><span>{message.text}</span><time>{status}</time></div>
}

function CompactComposer({ value, setValue, send }: ComposerRenderProps) {
  return <div className="compact-composer"><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Message" /><button type="button" onClick={send} aria-label="Send"><Send /></button></div>
}
