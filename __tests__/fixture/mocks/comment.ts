import type * as comment from '../../../src/comment.ts'
import { jest } from '@jest/globals'

export const upsertPrComment = jest.fn<typeof comment.upsertPrComment>()
export const fetchFlagSummaries = jest.fn<typeof comment.fetchFlagSummaries>()
