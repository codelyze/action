import type * as diff from '../../../src/diff.ts'
import { jest } from '@jest/globals'

export const analyzeDiffCoverage = jest.fn<typeof diff.analyzeDiffCoverage>()
