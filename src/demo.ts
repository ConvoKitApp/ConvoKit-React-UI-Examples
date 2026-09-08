import { ConvoKitClient, type MessageMedia, type RealtimeSubscription } from '@convokitapp/sdk'
import { resolveDemoConfig } from './endpoints'

export const personas = [
  { id: 'convokit_open_maya', name: 'Maya', initials: 'MC', color: '#6558d9' },
  { id: 'convokit_open_alex', name: 'Alex', initials: 'AR', color: '#009b82' },
  { id: 'convokit_open_sam', name: 'Sam', initials: 'SP', color: '#b58600' },
  { id: 'convokit_open_taylor', name: 'Taylor', initials: 'TK', color: '#dd527b' },
]
export const demoLinks = [
  { name: 'React', url: 'https://convokit-react-demo.vercel.app' },
  { name: 'Vue', url: 'https://convokit-vue-demo.vercel.app' },
  { name: 'Flutter', url: 'https://convokit-open-chatroom.vercel.app' },
]
export const demoTheme = {
  primary: '#108974',
  outgoingBubble: '#108974',
  background: '#ffffff',
  border: '#e0e9e6',
  radius: '16px',
}
export const demoConfig = resolveDemoConfig(import.meta.env, import.meta.env.PROD)
export const sessionKey = 'convokit-open-demo-session-v1'
type SavedSession = { userId: string; roomId: string }
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'
export const displayName = (id: string) => personas.find((persona) => persona.id === id)?.name || id
export const validUserId = (id: string) => /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id)

export function readSavedSession(): SavedSession | null {
  try {
    const saved = JSON.parse(localStorage.getItem(sessionKey) || 'null') as SavedSession | null
    return saved && validUserId(saved.userId) && typeof saved.roomId === 'string' ? saved : null
  } catch {
    return null
  }
}
function saveSession(saved: SavedSession | null) {
  // Store navigation only. Tokens and app secrets never go into browser storage.
  try {
    if (saved) localStorage.setItem(sessionKey, JSON.stringify(saved))
    else localStorage.removeItem(sessionKey)
  } catch {
    /* Storage can be disabled. */
  }
}
async function post(endpoint: string, body: object) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 404) throw new Error('Chatroom not found. Check the room ID and try again.')
    throw new Error(
      typeof result?.error === 'string' ? result.error : 'The demo service is unavailable. Please try again.',
    )
  }
  return result
}
export async function issueDemoToken(appUserId: string) {
  const body = await post(demoConfig.tokenEndpoint, { appUserId, displayName: displayName(appUserId) })
  // The shared demo broker uses data.token; custom product brokers may use token.
  const token = body?.data?.token ?? body?.token
  if (typeof token !== 'string' || !token.trim())
    throw new Error('The token service returned an invalid token.')
  return token
}
export async function joinDemoRoom(roomId: string, appUserId: string) {
  const id = roomId.trim()
  if (!id || id.length > 256) throw new Error('Enter a valid chatroom ID.')
  await post(demoConfig.joinEndpoint.replace(/\/$/, '') + '/' + encodeURIComponent(id) + '/join', {
    appUserId,
    displayName: displayName(appUserId),
  })
}
export type DemoState = {
  sdk: ConvoKitClient | null
  userId: string
  roomId: string
  busy: boolean
  error: string
  status: string
  activity: string[]
  online: string[]
  listRevision: number
}
type ClientFactory = () => ConvoKitClient

/** Demo-only identity/room orchestration. Chat state stays in the published UI SDK. */
export class DemoModel {
  private listeners = new Set<() => void>()
  private epoch = 0
  private client: ConvoKitClient | null = null
  private subscriptions: RealtimeSubscription[] = []
  private heartbeat: ReturnType<typeof setInterval> | undefined
  private state: DemoState = {
    sdk: null,
    userId: readSavedSession()?.userId || personas[0]!.id,
    roomId: '',
    busy: false,
    error: '',
    status: 'Not connected',
    activity: [],
    online: [],
    listRevision: 0,
  }
  constructor(
    private readonly makeClient: ClientFactory = () =>
      new ConvoKitClient({ ...demoConfig, tokenProvider: issueDemoToken }),
  ) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private patch(update: Partial<DemoState>) {
    this.state = { ...this.state, ...update }
    this.listeners.forEach((listener) => listener())
  }
  log = (message: string) => {
    this.patch({ activity: [message, ...this.state.activity].slice(0, 6) })
  }
  clearError = () => this.patch({ error: '' })
  report = (error: unknown) => this.patch({ error: errorMessage(error) })
  async start() {
    const saved = readSavedSession()
    if (saved) await this.connect(saved.userId, saved.roomId)
  }
  private release() {
    if (this.heartbeat) clearInterval(this.heartbeat)
    this.heartbeat = undefined
    this.subscriptions.forEach((subscription) => {
      void subscription.unsubscribe().catch(() => undefined)
    })
    this.subscriptions = []
    const old = this.client
    this.client = null
    if (old) void old.disconnectUser().catch(() => undefined)
  }
  stop = () => {
    ++this.epoch
    this.release()
  }
  disconnect = () => {
    this.stop()
    saveSession(null)
    this.patch({
      sdk: null,
      roomId: '',
      busy: false,
      error: '',
      online: [],
      status: 'Not connected',
      activity: [],
    })
  }
  async connect(rawUserId: string, restoredRoom = '') {
    const userId = rawUserId.trim()
    if (!validUserId(userId)) {
      this.report(
        new Error('Use 1–128 letters, numbers, dots, colons, underscores or hyphens for the user ID.'),
      )
      return
    }
    const epoch = ++this.epoch
    this.release()
    const sdk = this.makeClient()
    this.client = sdk
    this.patch({
      sdk: null,
      roomId: '',
      busy: true,
      error: '',
      status: 'Connecting…',
      userId,
      activity: [],
      online: [],
    })
    try {
      await sdk.connectUser(userId)
      if (epoch !== this.epoch) {
        await sdk.disconnectUser()
        return
      }
      this.subscriptions.push(
        sdk.realtime.onConnectionEvent({
          onEvent: (event) => {
            if (epoch === this.epoch)
              this.patch({ status: event.status === 'SUBSCRIBED' ? 'Live' : 'Reconnecting…' })
          },
          onError: (error) => {
            if (epoch === this.epoch) this.log(errorMessage(error))
          },
          onSessionEnded: () => {
            if (epoch === this.epoch) {
              this.disconnect()
              this.report(new Error('Your session ended. Please reconnect.'))
            }
          },
        }),
      )
      this.subscriptions.push(
        sdk.realtime.onPresence(sdk.clientId, {
          onEvent: (event) => {
            if (epoch !== this.epoch) return
            const online = new Set(this.state.online)
            if (event.isOnline) online.add(event.userId)
            else online.delete(event.userId)
            this.patch({ online: [...online] })
          },
          onError: (error) => {
            if (epoch === this.epoch) this.log(errorMessage(error))
          },
        }),
      )
      this.patch({
        sdk,
        roomId: restoredRoom,
        status: 'Joining channels…',
        busy: false,
        listRevision: this.state.listRevision + 1,
      })
      saveSession({ userId, roomId: restoredRoom })
      this.log('Connected as ' + displayName(userId))
      const announce = () => {
        if (epoch === this.epoch)
          void sdk.updatePresence({ isOnline: true }).catch((error) => this.log(errorMessage(error)))
      }
      announce()
      this.heartbeat = setInterval(announce, 45_000)
    } catch (error) {
      if (epoch !== this.epoch) return
      this.release()
      saveSession(null)
      this.patch({ sdk: null, busy: false, status: 'Not connected', error: errorMessage(error) })
    }
  }
  selectRoom = (roomId: string) => {
    this.patch({ roomId, error: '' })
    saveSession({ userId: this.state.userId, roomId })
    if (roomId) this.log('Opened room · ' + roomId.slice(0, 8))
  }
  async enterRoom(mode: 'join' | 'create', value: string): Promise<boolean> {
    const sdk = this.state.sdk
    const epoch = this.epoch
    if (!sdk || this.state.busy) return false
    if (!value.trim()) {
      this.report(new Error(mode === 'join' ? 'Enter a chatroom ID.' : 'Enter a room name.'))
      return false
    }
    this.patch({ busy: true, error: '' })
    try {
      let room
      if (mode === 'join') {
        await joinDemoRoom(value, this.state.userId)
        room = await sdk.getConversation(value.trim())
      } else room = await sdk.createConversation({ title: value.trim(), participants: [this.state.userId] })
      if (epoch !== this.epoch) return false
      this.selectRoom(room.id)
      this.patch({ listRevision: this.state.listRevision + 1 })
      this.log(mode === 'join' ? 'Chatroom membership granted' : 'Created ' + room.displayTitle)
      return true
    } catch (error) {
      if (epoch === this.epoch) this.report(error)
      return false
    } finally {
      if (epoch === this.epoch) this.patch({ busy: false })
    }
  }
}

export async function uploadAttachment(
  sdk: ConvoKitClient,
  roomId: string,
  file: File,
): Promise<MessageMedia> {
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('Choose a non-empty file up to 20 MB.')
  const url = await sdk.uploadMessageMedia({
    conversationId: roomId,
    fileName: file.name,
    bytes: file,
    contentType: file.type || 'application/octet-stream',
  })
  return { type: file.type.startsWith('image/') ? 'image' : 'file', url, name: file.name, size: file.size }
}
export async function downloadAttachment(sdk: ConvoKitClient, media: MessageMedia) {
  if (media.type !== 'image' && media.type !== 'file') return
  const blob = await sdk.downloadMedia(media.url)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = media.name || 'attachment'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
