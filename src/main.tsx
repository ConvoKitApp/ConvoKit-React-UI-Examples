import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@convokitapp/react-ui/styles.css'
import './styles.css'
import { LiveExample } from './LiveExample'
import { ShowcaseApp } from './ShowcaseApp'

const params = new URLSearchParams(window.location.search)
const isLive = params.get('mode') !== 'showcase' && (!params.has('variant') || params.get('mode') === 'live')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isLive ? <LiveExample /> : <ShowcaseApp />}</StrictMode>,
)
