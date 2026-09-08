import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConvoKitClient, RealtimeConnectionHandlers } from '@convokitapp/sdk'
import {
  DemoModel,
  demoConfig,
  issueDemoToken,
  joinDemoRoom,
  readSavedSession,
  sessionKey,
  uploadAttachment,
} from './demo'
import { resolveDemoConfig } from './endpoints'

beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })
function fakeSdk() {
  let connection: RealtimeConnectionHandlers | undefined
  const unsubscribe = vi.fn(async () => undefined)
  const sdk = {
    clientId: demoConfig.clientId,
    connectUser: vi.fn(async () => undefined),
    disconnectUser: vi.fn(async () => undefined),
    updatePresence: vi.fn(async () => undefined),
    getConversation: vi.fn(async (id: string) => ({ id, displayTitle: 'Joined room' })),
    createConversation: vi.fn(async () => ({ id: 'created-room', displayTitle: 'New room' })),
    realtime: {
      onConnectionEvent: vi.fn((handlers: RealtimeConnectionHandlers) => {
        connection = handlers
        return { unsubscribe, closed: false }
      }),
      onPresence: vi.fn(() => ({ unsubscribe, closed: false })),
    },
  }
  return { sdk: sdk as unknown as ConvoKitClient, mock: sdk, unsubscribe, connection: () => connection }
}

describe('shared live-demo backend contract', () => {
  it('rejects production loopback/insecure endpoints and allows explicit local development', () => {
    expect(() =>
      resolveDemoConfig({ VITE_CONVOKIT_TOKEN_ENDPOINT: 'http://127.0.0.1:3001/api/auth/token' }, true),
    ).toThrow('public HTTPS')
    expect(() => resolveDemoConfig({ VITE_CONVOKIT_BACKEND_URL: 'https://localhost:3000' }, true)).toThrow(
      'public HTTPS',
    )
    expect(resolveDemoConfig({ VITE_CONVOKIT_BACKEND_URL: 'http://127.0.0.1:3000' }, false).backendUrl).toBe(
      'http://127.0.0.1:3000',
    )
  })
  it('uses public HTTPS defaults, never loopback or a browser client secret', () => {
    for (const key of ['backendUrl', 'tokenEndpoint', 'joinEndpoint'] as const)
      expect(demoConfig[key]).toMatch(/^https:\/\//)
    expect(demoConfig).not.toHaveProperty('clientSecret')
  })
  it('parses the existing broker data.token envelope', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ data: { token: 'scoped-user-token' } }) as Response)
    vi.stubGlobal('fetch', fetcher)
    expect(await issueDemoToken('convokit_open_maya')).toBe('scoped-user-token')
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual({
      appUserId: 'convokit_open_maya',
      displayName: 'Maya',
    })
  })
  it('supports a host product token endpoint without an envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ token: 'custom-user-token' })),
    )
    expect(await issueDemoToken('custom-user')).toBe('custom-user-token')
  })
  it('rejects malformed token responses before initializing Realtime', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ data: {} })),
    )
    await expect(issueDemoToken('maya')).rejects.toThrow('invalid token')
  })
  it('encodes room IDs and requests membership through the demo broker', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ data: { joined: true } }) as Response)
    vi.stubGlobal('fetch', fetcher)
    await joinDemoRoom(' room/test ', 'alex')
    expect(fetcher.mock.calls[0]![0]).toBe(demoConfig.joinEndpoint + '/room%2Ftest/join')
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body)).appUserId).toBe('alex')
  })
  it('returns a useful error for unknown rooms', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({}, 404)),
    )
    await expect(joinDemoRoom('unknown-room', 'alex')).rejects.toThrow('Chatroom not found')
  })
  it('ignores malformed persisted identities', () => {
    localStorage.setItem(sessionKey, JSON.stringify({ userId: {}, roomId: 'room' }))
    expect(readSavedSession()).toBeNull()
  })
})

describe('demo session and room orchestration', () => {
  it('creates a room with the caller and persists identifiers only', async () => {
    const { sdk, mock } = fakeSdk()
    const model = new DemoModel(() => sdk)
    try {
      await model.connect('maya')
      expect(await model.enterRoom('create', ' Team room ')).toBe(true)
      expect(mock.createConversation).toHaveBeenCalledWith({ title: 'Team room', participants: ['maya'] })
      expect(model.getSnapshot().roomId).toBe('created-room')
      expect(JSON.parse(localStorage.getItem(sessionKey)!)).toEqual({
        userId: 'maya',
        roomId: 'created-room',
      })
    } finally {
      model.stop()
    }
  })
  it('grants membership before fetching the selected room', async () => {
    const { sdk, mock } = fakeSdk()
    const model = new DemoModel(() => sdk)
    const fetcher = vi.fn(async () => {
      expect(mock.getConversation).not.toHaveBeenCalled()
      return response({})
    })
    vi.stubGlobal('fetch', fetcher)
    try {
      await model.connect('alex')
      expect(await model.enterRoom('join', 'test-room')).toBe(true)
      expect(mock.getConversation).toHaveBeenCalledWith('test-room')
    } finally {
      model.stop()
    }
  })
  it('does not connect invalid user IDs', async () => {
    const { sdk, mock } = fakeSdk()
    const model = new DemoModel(() => sdk)
    await model.connect('bad user id')
    expect(mock.connectUser).not.toHaveBeenCalled()
    expect(model.getSnapshot().error).toContain('1–128')
  })
  it('ignores late login completion after unmount/disconnect', async () => {
    const { sdk, mock } = fakeSdk()
    let finish!: () => void
    mock.connectUser.mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          finish = () => resolve(undefined)
        }),
    )
    const model = new DemoModel(() => sdk)
    const pending = model.connect('maya')
    model.disconnect()
    finish()
    await pending
    expect(model.getSnapshot().sdk).toBeNull()
    expect(localStorage.getItem(sessionKey)).toBeNull()
    expect(mock.disconnectUser).toHaveBeenCalled()
  })
  it('ends UI ownership on terminal session retirement', async () => {
    const { sdk, connection, unsubscribe } = fakeSdk()
    const model = new DemoModel(() => sdk)
    await model.connect('maya')
    connection()?.onSessionEnded?.()
    expect(model.getSnapshot().sdk).toBeNull()
    expect(model.getSnapshot().error).toContain('session ended')
    expect(unsubscribe).toHaveBeenCalled()
  })
  it('restores the saved persona and room without storing tokens', async () => {
    localStorage.setItem(sessionKey, JSON.stringify({ userId: 'alex', roomId: 'retained-room' }))
    const { sdk, mock } = fakeSdk()
    const model = new DemoModel(() => sdk)
    try {
      await model.start()
      expect(mock.connectUser).toHaveBeenCalledWith('alex')
      expect(model.getSnapshot().roomId).toBe('retained-room')
    } finally {
      model.stop()
    }
  })
  it('validates attachments and delegates signing/upload to the published SDK', async () => {
    const upload = vi.fn(async () => 'https://media.convokit.app/file.txt')
    const sdk = { uploadMessageMedia: upload } as unknown as ConvoKitClient
    const file = new File(['hello'], 'demo.txt', { type: 'text/plain' })
    expect(await uploadAttachment(sdk, 'room', file)).toMatchObject({
      type: 'file',
      name: 'demo.txt',
      size: 5,
    })
    expect(upload).toHaveBeenCalledWith({
      bytes: file,
      contentType: 'text/plain',
      conversationId: 'room',
      fileName: 'demo.txt',
    })
    await expect(uploadAttachment(sdk, 'room', new File([], 'empty.txt'))).rejects.toThrow('non-empty')
  })
})
