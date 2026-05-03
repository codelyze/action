import type * as diff from '../../../src/diff'
import { jest } from '@jest/globals'

export const analyzeDiffCoverage = jest.fn<typeof diff.analyzeDiffCoverage>()
