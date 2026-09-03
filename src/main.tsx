import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@convokitapp/react-ui/styles.css'
import './styles.css'
import { LiveExample } from './LiveExample'
import { ShowcaseApp } from './ShowcaseApp'

const isLive = new URLSearchParams(window.location.search).get('mode') === 'live'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isLive ? <LiveExample /> : <ShowcaseApp />}</StrictMode>,
)
