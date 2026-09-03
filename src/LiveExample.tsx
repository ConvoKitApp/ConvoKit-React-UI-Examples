import { ConvoKitClient } from '@convokitapp/sdk'
import { Conversation, ConversationList, createConvoKitUiClient, type ConvoKitUiClient } from '@convokitapp/react-ui'
import { useEffect, useMemo, useState } from 'react'

const backendUrl = import.meta.env.VITE_CONVOKIT_BACKEND_URL as string | undefined
const clientId = import.meta.env.VITE_CONVOKIT_CLIENT_ID as string | undefined
const tokenEndpoint = import.meta.env.VITE_CONVOKIT_TOKEN_ENDPOINT as string | undefined

export function LiveExample() {
  const [userId, setUserId] = useState('demo-user')
  const [roomIdDraft, setRoomIdDraft] = useState('')
  const [roomId, setRoomId] = useState('')
  const [uiClient, setUiClient] = useState<ConvoKitUiClient | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sdk = useMemo(() => {
    if (!backendUrl || !clientId || !tokenEndpoint) return null
    return new ConvoKitClient({
      backendUrl,
      clientId,
      tokenProvider: async (appUserId) => {
        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appUserId }),
        })
        if (!response.ok) throw new Error('Could not issue the user token')
        const body = await response.json() as { token: string }
        return body.token
      },
    })
  }, [])

  useEffect(() => () => { void sdk?.disconnectUser() }, [sdk])

  const connect = async () => {
    if (!sdk) return
    setError(null)
    try {
      await sdk.connectUser(userId)
      setUiClient(createConvoKitUiClient(sdk))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  if (!sdk) {
    return <main className="live-setup"><h1>Live ConvoKit example</h1><p>Set <code>VITE_CONVOKIT_BACKEND_URL</code>, <code>VITE_CONVOKIT_CLIENT_ID</code>, and <code>VITE_CONVOKIT_TOKEN_ENDPOINT</code> to enable this page.</p></main>
  }

  if (!uiClient) {
    return <main className="live-setup"><h1>Live ConvoKit example</h1><label>App user ID<input value={userId} onChange={(event) => setUserId(event.target.value)} /></label><button type="button" onClick={() => void connect()}>Connect</button>{error ? <p role="alert">{error}</p> : null}</main>
  }

  return (
    <main className="live-layout">
      <aside>
        <ConversationList
          client={uiClient}
          selectedConversationId={roomId}
          onConversationSelect={(room) => setRoomId(room.id)}
        />
      </aside>
      <section>
        {roomId ? (
          <Conversation
            client={uiClient}
            conversationId={roomId}
            onBack={() => setRoomId('')}
          />
        ) : (
          <form
            className="live-room"
            onSubmit={(event) => {
              event.preventDefault()
              const nextRoomId = roomIdDraft.trim()
              if (nextRoomId) setRoomId(nextRoomId)
            }}
          >
            <label>
              Open a room ID
              <input
                value={roomIdDraft}
                onChange={(event) => setRoomIdDraft(event.target.value)}
              />
            </label>
            <p>Your backend must grant this user room membership before the UI can load it.</p>
            <button type="submit" disabled={!roomIdDraft.trim()}>Open room</button>
          </form>
        )}
      </section>
    </main>
  )
}
