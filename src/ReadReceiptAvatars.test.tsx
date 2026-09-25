import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReadReceiptAvatars } from './ReadReceiptAvatars'

describe('live read receipts', () => {
  it('shows reader identities as compact avatars', () => {
    render(<ReadReceiptAvatars readerIds={new Set(['convokit_open_alex', 'convokit_open_sam'])} />)
    const receipt = screen.getByRole('group', { name: 'Read by Alex, Sam' })
    expect(receipt.querySelectorAll('.demo-read-receipt__avatar')).toHaveLength(2)
    expect(receipt).toHaveTextContent('AR')
    expect(receipt).toHaveTextContent('SP')
  })
})
