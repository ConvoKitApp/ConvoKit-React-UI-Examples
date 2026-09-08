# ConvoKit React UI examples

Public, runnable examples showing how an application can configure
[`@convokitapp/react-ui`](https://www.npmjs.com/package/@convokitapp/react-ui)
without copying or modifying the package source.

This repository contains application code only. It depends on the published
React UI package and the core [`@convokitapp/sdk`](https://www.npmjs.com/package/@convokitapp/sdk).

## Live open-chatroom demo

This example consumes the published 0.4.0 core and UI packages. The UI library
automatically refreshes inboxes on room/membership changes and replaces pending
messages when their matching live/history confirmation arrives. No demo-side
polling, text matching or duplicate-bubble workaround is required.

[Open the React demo](https://convokit-react-demo.vercel.app). It uses the same backend, demo personas and
room IDs as the [Flutter demo](https://convokit-open-chatroom.vercel.app).
The default page is now the real SDK-backed app; no environment variables are
required to try the shared demo.

- Choose Maya, Alex, Sam or Taylor, or enter your own demo user ID.
- Create a conversation and copy its room ID, or join an existing room by ID.
- Open another framework/device with a different persona to test messages,
  typing, read receipts, images and files. Attachments are limited to 20 MB.
- Reload restores the user and selected room. Switch user ends that SDK session.
- The inbox and chat are the published UI package's components/controllers.
  App code only supplies branding, the demo identity/room flow and upload/download hooks.

This is deliberately an **open testing environment**. Anyone who knows a room ID
can join. Do not post confidential information. No client secret is bundled into
these public apps; it stays in the existing server-side token/join broker.

## Component showcase

The offline showcase uses local fixture data. Start the app and open
\`?mode=showcase\` to use it without connecting to a backend:

```bash
npm install
npm run dev
```

Use the selector to compare configurations, or open `?variant=standard`,
`?variant=branded`, or `?variant=compact` directly.

### Standard components

![Standard ConvoKit React conversation list and chat components](doc/screenshots/standard-components.png)

Web-native, shadcn-inspired package defaults plus refresh, attachment,
read-position, image/file rendering, and bottom-anchored messages.

### Branded customer support

![Branded ConvoKit React customer support interface](doc/screenshots/branded-support.png)

A restrained product-branded support workspace built with `renderConversationItem`, `renderHeader`,
`renderMedia`, `renderReadReceipt`, and `renderComposer`.

### Compact operations

![Compact ConvoKit React operations interface](doc/screenshots/compact-operations.png)

A dense dashboard built with `density="compact"`, custom rows, message lines,
typing state, composer, and `stickToBottom={false}`.

The complete configuration is in [`src/ShowcaseApp.tsx`](src/ShowcaseApp.tsx).

## Live SDK-backed example

To use your own app instead of the shared demo, override all matching public
frontend settings (`?mode=live` remains supported):

```bash
VITE_CONVOKIT_CLIENT_ID=public-client-id
VITE_CONVOKIT_TOKEN_ENDPOINT=https://app.example.com/api/convokit-token
VITE_CONVOKIT_JOIN_ENDPOINT=https://app.example.com/api/chatrooms
```

The managed `https://api.convokit.app` endpoint is automatic. Optionally set
`VITE_CONVOKIT_BACKEND_URL` only for local testing or self-hosting.

The token endpoint runs on your backend and must authenticate the host user.
It can return `{ token }` or `{ data: { token } }`. The join endpoint receives
`POST /:roomId/join` with `{ appUserId, displayName }`; your backend must authorize
membership before the UI opens the room. Replace this open-demo policy in a real product.
Never expose the ConvoKit client secret in a React application or Vite variable.

## Verification

```bash
npm ci
npm run validate
```

## Vercel deployment

The checked-in `vercel.json` builds this Vite app and supports direct navigation.
The production build rejects insecure/localhost API or broker endpoints. Local
loopback overrides are accepted only by the development build.

```bash
npm ci
npm run validate
vercel link --project convokit-react-demo --team techpools-projects
vercel deploy --prod
```

Shared live demos: [React](https://convokit-react-demo.vercel.app) ·
[Vue](https://convokit-vue-demo.vercel.app) ·
[Flutter](https://convokit-open-chatroom.vercel.app).
