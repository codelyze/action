/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import { jest } from '@jest/globals'

// Mock the action's entrypoint
jest.unstable_mockModule('../src/main', () => ({ run: jest.fn() }))

describe('index', () => {
  it('calls run when imported', async () => {
    const main = await import('../src/main')
    const runMock = jest.spyOn(main, 'run')
    await import('../src/index')

    expect(runMock).toHaveBeenCalled()
  })
})
