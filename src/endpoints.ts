export const publicDemoDefaults = {
  clientId: '998da6ce-2572-42b1-8c60-734ce09c88e4',
  backendUrl: 'https://api.convokit.app',
  tokenEndpoint: 'https://convokit-open-chatroom.vercel.app/api/auth/token',
  joinEndpoint: 'https://convokit-open-chatroom.vercel.app/api/chatrooms',
}
export function resolveDemoConfig(env: Record<string, unknown>, production: boolean) {
  const config = {
    clientId: String(env.VITE_CONVOKIT_CLIENT_ID || publicDemoDefaults.clientId),
    backendUrl: String(env.VITE_CONVOKIT_BACKEND_URL || publicDemoDefaults.backendUrl),
    tokenEndpoint: String(env.VITE_CONVOKIT_TOKEN_ENDPOINT || publicDemoDefaults.tokenEndpoint),
    joinEndpoint: String(env.VITE_CONVOKIT_JOIN_ENDPOINT || publicDemoDefaults.joinEndpoint),
  }
  for (const name of ['backendUrl', 'tokenEndpoint', 'joinEndpoint'] as const) {
    const url = new URL(config[name])
    const loopback = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(url.hostname)
    if (
      url.username ||
      url.password ||
      (production
        ? url.protocol !== 'https:' || loopback
        : url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
    ) {
      throw new Error(
        name +
          ' must use a public HTTPS endpoint for production. Loopback HTTP is for local development only.',
      )
    }
  }
  return config
}
