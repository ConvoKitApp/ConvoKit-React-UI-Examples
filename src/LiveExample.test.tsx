import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveExample } from './LiveExample'
import { DemoModel } from './demo'

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
describe('React live demo', () => {
  it('renders the branded launch flow and links all three demos', () => {
    render(<LiveExample />)
    expect(screen.getByRole('heading', { name: 'Your workspace awaits' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vue' })).toHaveAttribute(
      'href',
      'https://convokit-vue-demo.vercel.app',
    )
    expect(screen.getByText(/open testing workspace/)).toBeInTheDocument()
  })
  it('connects the selected persona through demo orchestration', () => {
    const connect = vi.spyOn(DemoModel.prototype, 'connect').mockResolvedValue()
    render(<LiveExample />)
    fireEvent.click(screen.getByRole('button', { name: 'AR Alex' }))
    fireEvent.click(screen.getByRole('button', { name: 'Launch workspace' }))
    expect(connect).toHaveBeenCalledWith('convokit_open_alex')
  })
})
