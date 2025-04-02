import type * as cov from '../../../src/coverage.ts'
import { jest } from '@jest/globals'

export const coverage = jest.fn<typeof cov.coverage>()
