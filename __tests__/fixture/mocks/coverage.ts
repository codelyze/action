import type * as cov from '../../../src/coverage'
import { jest } from '@jest/globals'

export const coverage = jest.fn<typeof cov.coverage>()
