import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom has no `scrollIntoView`, and the package calls it on the row a jump lands on (0.9). Tests that
// assert the jump spy on this same property, so it is left writable.
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  writable: true,
  value: vi.fn(),
})
