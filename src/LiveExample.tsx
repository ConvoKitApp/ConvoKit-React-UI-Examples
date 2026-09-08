import {
  Conversation,
  ConversationList,
  ConvoKitThemeProvider,
  createConvoKitUiClient,
  type ConversationController,
  type ConversationListController,
  type ConvoKitUiClient,
} from '@convokitapp/react-ui'
import type { ConvoKitClient } from '@convokitapp/sdk'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  DemoModel,
  demoLinks,
  demoTheme,
  displayName,
  downloadAttachment,
  errorMessage,
  personas,
  uploadAttachment,
} from './demo'
import './live.css'

export function LiveExample() {
  const [model] = useState(() => new DemoModel())
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const [userId, setUserId] = useState(state.userId)
  const [modal, setModal] = useState<'join' | 'create' | null>(null)
  const [roomDraft, setRoomDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const list = useRef<ConversationListController | null>(null)
  const ui = useMemo(() => (state.sdk ? createConvoKitUiClient(state.sdk) : null), [state.sdk])
  useEffect(() => {
    void model.start()
    return model.stop
  }, [model])
  const openDialog = (mode: 'join' | 'create') => {
    model.clearError()
    setRoomDraft('')
    setModal(mode)
  }
  const copyRoom = async () => {
    try {
      await navigator.clipboard.writeText(state.roomId)
      setCopied(true)
    } catch {
      model.report(new Error('Could not copy. Select the room ID below and copy it manually.'))
    }
  }

  return (
    <ConvoKitThemeProvider theme={demoTheme}>
      <main className={'demo-app ' + (ui ? 'demo-app--connected' : '')}>
        <header className="demo-header">
          <a href="/" className="demo-brand">
            <span className="demo-mark">
              <MessageCircle size={22} />
            </span>
            <strong>ConvoKit</strong>
            <span className="demo-platform">React</span>
          </a>
          <nav className="demo-platforms" aria-label="Demo platforms">
            {demoLinks.map((link) => (
              <a key={link.name} href={link.url} aria-current={link.name === 'React' ? 'page' : undefined}>
                {link.name}
              </a>
            ))}
          </nav>
          {ui ? (
            <div className="demo-account">
              <span className="status-dot" />
              <span>{displayName(state.userId)}</span>
              <button
                type="button"
                className="icon-button"
                title="Switch user"
                aria-label="Switch user"
                onClick={model.disconnect}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <a className="demo-showcase-link" href="?mode=showcase">
              Component showcase <ArrowRight size={14} />
            </a>
          )}
        </header>

        {!ui ? (
          <section className="demo-launch">
            <div className="demo-launch-intro">
              <span className="demo-eyebrow">OPEN CHATROOM · LIVE DEMO</span>
              <h1>
                A little less setup.
                <br />A lot more conversation.
              </h1>
              <p>
                Connect, find your people, and try ConvoKit in a real chat. The same rooms work across React,
                Vue and Flutter.
              </p>
              <div className="demo-feature-tags">
                <span>Live messages</span>
                <span>Images & files</span>
                <span>Read receipts</span>
              </div>
            </div>
            <form
              className="demo-login-card"
              onSubmit={(event) => {
                event.preventDefault()
                void model.connect(userId)
              }}
            >
              <span className="demo-card-icon">
                <MessageCircle size={28} />
              </span>
              <h2>Your workspace awaits</h2>
              <p>Choose a demo persona or enter any unique app user ID.</p>
              <fieldset disabled={state.busy}>
                <legend>QUICK PERSONAS</legend>
                <div className="demo-personas">
                  {personas.map((persona) => (
                    <button
                      key={persona.id}
                      type="button"
                      aria-pressed={userId === persona.id}
                      onClick={() => setUserId(persona.id)}
                    >
                      <span style={{ color: persona.color }}>{persona.initials}</span>
                      {persona.name}
                    </button>
                  ))}
                </div>
                <label className="demo-field">
                  Demo user ID
                  <input
                    autoComplete="off"
                    value={userId}
                    maxLength={128}
                    onChange={(event) => setUserId(event.target.value)}
                  />
                </label>
                <button className="demo-primary demo-launch-button" type="submit" disabled={!userId.trim()}>
                  <ArrowRight size={20} />
                  {state.busy ? 'Connecting…' : 'Launch workspace'}
                </button>
              </fieldset>
              {state.error && (
                <p className="demo-error" role="alert">
                  {state.error}
                </p>
              )}
              <p className="demo-disclaimer">
                This is an open testing workspace. Anyone with a room ID can join. Please don’t share private
                information.
              </p>
            </form>
            <footer className="demo-launch-footer">
              Built with the published <code>@convokitapp/react-ui</code> package.{' '}
              <a href="https://github.com/ConvoKitApp/ConvoKit-React-UI-Examples">View example source ↗</a>
            </footer>
          </section>
        ) : (
          <>
            <div className="demo-workspace-toolbar">
              <div>
                <span className="demo-eyebrow">TEAM WORKSPACE</span>
                <h1>Your conversations</h1>
              </div>
              <div className="demo-actions">
                <button type="button" className="demo-secondary" onClick={() => openDialog('join')}>
                  Join with room ID
                </button>
                <button type="button" className="demo-primary" onClick={() => openDialog('create')}>
                  <Plus size={16} />
                  New conversation
                </button>
              </div>
            </div>
            {state.error && !modal && (
              <div className="demo-workspace-error demo-error" role="alert">
                {state.error}
                <button
                  type="button"
                  className="icon-button"
                  onClick={model.clearError}
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="demo-workspace" data-room-open={Boolean(state.roomId)}>
              <aside className="demo-sidebar">
                <div className="demo-panel-title">
                  <h2>Conversations</h2>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Refresh conversations"
                    onClick={() => {
                      void list.current?.refresh()
                      model.log('Refreshed conversations')
                    }}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <label className="demo-search">
                  <Search size={16} />
                  <input
                    aria-label="Search conversations"
                    placeholder="Search conversations"
                    onChange={(event) => {
                      void list.current?.setQuery(event.target.value)
                    }}
                  />
                </label>
                <ConversationList
                  key={state.listRevision}
                  client={ui}
                  pageSize={20}
                  selectedConversationId={state.roomId}
                  onConversationSelect={(room) => {
                    setCopied(false)
                    model.selectRoom(room.id)
                  }}
                  onControllerChange={(controller) => {
                    list.current = controller
                  }}
                />
                <div className="demo-sidebar-footer">
                  <span className="status-dot" />
                  {state.status}
                  <span>UI SDK 0.4.0</span>
                </div>
              </aside>
              <section className="demo-chat-panel" aria-label="Chat workspace">
                {state.roomId && state.sdk ? (
                  <>
                    <div className="demo-room-bar">
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Back to conversations"
                        onClick={() => model.selectRoom('')}
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <code title={state.roomId}>{state.roomId}</code>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Copy room ID"
                        onClick={() => void copyRoom()}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <LiveConversation
                      key={state.roomId + state.userId}
                      sdk={state.sdk}
                      ui={ui}
                      roomId={state.roomId}
                      onBack={() => model.selectRoom('')}
                    />
                  </>
                ) : (
                  <div className="demo-empty">
                    <span className="demo-empty-icon">
                      <MessageCircle size={36} />
                    </span>
                    <h2>A good conversation starts here</h2>
                    <p>Pick a conversation, create a new one, or join a friend using their room ID.</p>
                    <button className="demo-primary" type="button" onClick={() => openDialog('join')}>
                      Join a chatroom <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </section>
              <aside className="demo-inspector">
                <span className="demo-eyebrow">UNDER THE HOOD</span>
                <h2>SDK activity</h2>
                <p>The ConvoKit surface behind each interaction.</p>
                <ol>
                  {state.activity.map((item, index) => (
                    <li key={index}>
                      <span className="status-dot" />
                      {item}
                    </li>
                  ))}
                </ol>
                <div className="demo-health">
                  <h3>Integration health</h3>
                  <dl>
                    <dt>Authentication</dt>
                    <dd>Scoped token</dd>
                    <dt>Realtime</dt>
                    <dd>{state.status}</dd>
                    <dt>Presence</dt>
                    <dd>{state.online.length} observed online</dd>
                  </dl>
                </div>
                <a href="?mode=showcase">Explore component props ↗</a>
              </aside>
            </div>
          </>
        )}

        {modal && (
          <div
            className="demo-modal-backdrop"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !state.busy) setModal(null)
            }}
          >
            <section
              className="demo-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="room-dialog-title"
            >
              <button
                className="icon-button demo-modal-close"
                type="button"
                aria-label="Close dialog"
                disabled={state.busy}
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
              <span className="demo-card-icon">
                <MessageCircle size={26} />
              </span>
              <h2 id="room-dialog-title">{modal === 'join' ? 'Join a chatroom' : 'Start a conversation'}</h2>
              <p>
                {modal === 'join'
                  ? 'Paste a room ID from any of the three demo apps. We’ll grant your demo user membership.'
                  : 'Create a room, then share its ID with another persona or device.'}
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void model.enterRoom(modal, roomDraft).then((ok) => {
                    if (ok) {
                      setCopied(false)
                      setModal(null)
                    }
                  })
                }}
              >
                <label className="demo-field">
                  {modal === 'join' ? 'Chatroom ID' : 'Conversation name'}
                  <input
                    autoFocus
                    value={roomDraft}
                    disabled={state.busy}
                    maxLength={256}
                    onChange={(event) => setRoomDraft(event.target.value)}
                  />
                </label>
                {state.error && (
                  <p className="demo-error" role="alert">
                    {state.error}
                  </p>
                )}
                <button
                  className="demo-primary demo-launch-button"
                  disabled={state.busy || !roomDraft.trim()}
                  type="submit"
                >
                  {state.busy ? 'Please wait…' : modal === 'join' ? 'Join chatroom' : 'Create conversation'}
                  <ArrowRight size={18} />
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </ConvoKitThemeProvider>
  )
}

function LiveConversation({
  sdk,
  ui,
  roomId,
  onBack,
}: {
  sdk: ConvoKitClient
  ui: ConvoKitUiClient
  roomId: string
  onBack: () => void
}) {
  const controller = useRef<ConversationController | null>(null)
  const picker = useRef<HTMLInputElement | null>(null)
  const alive = useRef(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const attach = async (file?: File) => {
    if (!file || uploading || !controller.current) return
    const owner = controller.current
    setUploading(true)
    setError('')
    try {
      const media = await uploadAttachment(sdk, roomId, file)
      if (!alive.current) return
      if (!(await owner.sendMessage({ media: [media] })))
        throw new Error('The attachment was not sent. Please try again.')
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause))
    } finally {
      if (alive.current) setUploading(false)
      if (picker.current) picker.current.value = ''
    }
  }
  return (
    <div className="demo-conversation">
      <input
        hidden
        ref={picker}
        type="file"
        aria-label="Choose attachment"
        onChange={(event) => void attach(event.target.files?.[0])}
      />
      {uploading && (
        <div className="demo-upload-status" role="status">
          Uploading attachment…
        </div>
      )}
      {error && (
        <div className="demo-error" role="alert">
          {error}
        </div>
      )}
      <Conversation
        client={ui}
        conversationId={roomId}
        messagePageSize={30}
        onBack={onBack}
        onControllerChange={(value) => {
          controller.current = value
        }}
        onAddAttachment={() => {
          if (!uploading) picker.current?.click()
        }}
        onAttachmentClick={(media) => {
          void downloadAttachment(sdk, media).catch((cause) => {
            if (alive.current) setError(errorMessage(cause))
          })
        }}
        composerPlaceholder="Message your team…"
        formatTime={(date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      />
    </div>
  )
}
