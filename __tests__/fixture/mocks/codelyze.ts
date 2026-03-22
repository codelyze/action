import type * as codelyze from '../../../src/codelyze.ts'
import { jest } from '@jest/globals'

export const coverage = jest.fn<typeof codelyze.coverage>()