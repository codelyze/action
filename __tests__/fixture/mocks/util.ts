import type * as util from '../../../src/util.ts'
import { jest } from '@jest/globals'

export const getContextInfo = jest.fn<typeof util.getContextInfo>()
export const isErrorLike = jest.fn<typeof util.isErrorLike>()
export const createCommitStatus = jest.fn<typeof util.createCommitStatus>()
export const percentString = jest.fn<typeof util.percentString>()
