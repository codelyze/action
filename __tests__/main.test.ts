import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { jest } from '@jest/globals'
import type { CommitStatusResponse } from '../src/types'

import * as coreMock from './fixture/mocks/core.ts'
import * as githubMock from './fixture/mocks/github.ts'
import * as covMock from './fixture/mocks/coverage.ts'
import * as diffMock from './fixture/mocks/diff.ts'
import * as utilMock from './fixture/mocks/util.ts'

jest.unstable_mockModule('@actions/core', () => coreMock)
jest.unstable_mockModule('@actions/github', () => githubMock)
jest.unstable_mockModule('../src/coverage', () => covMock)
jest.unstable_mockModule('../src/diff', () => diffMock)
jest.unstable_mockModule('../src/util', () => utilMock)

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('action', () => {
  beforeEach(() => {
    coreMock.error.mockImplementation(() => {})
    coreMock.getInput.mockImplementation(() => '')
    coreMock.getBooleanInput.mockImplementation(() => false)
    coreMock.setFailed.mockImplementation(() => {})
    coreMock.setOutput.mockImplementation(() => {})
    covMock.coverage.mockResolvedValue({
      rate: 0.9,
      diff: 0.9,
      status: {} as CommitStatusResponse,
      diffCoverageStatus: {} as CommitStatusResponse,
      linesFound: 10,
      linesCovered: 9
    })
    diffMock.analyzeDiffCoverage.mockResolvedValue({
      linesHit: 12,
      linesFound: 13,
      uncoveredHunks: []
    })
    utilMock.getContextInfo.mockReturnValue({
      repo: 'repo',
      owner: 'owner',
      sha: 'sha',
      ref: 'ref',
      compareSha: 'compareSha'
    })
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('sets the output', async () => {
    coreMock.getInput.mockImplementation((name: string): string => {
      switch (name) {
        case 'path':
          return `${__dirname}/fixture/a.info`
        default:
          return ''
      }
    })

    const { run } = await import('../src/main')
    await run()

    expect(diffMock.analyzeDiffCoverage).toHaveBeenCalled()
    expect(covMock.coverage).toHaveBeenCalled()
    expect(coreMock.setOutput).toHaveBeenNthCalledWith(1, 'coverage', {
      linesCovered: 9,
      linesFound: 10,
      rate: 0.9
    })
    expect(coreMock.setOutput).toHaveBeenNthCalledWith(2, 'difference', 0.9)
    expect(coreMock.setOutput).toHaveBeenNthCalledWith(3, 'patch', {
      linesCovered: 12,
      linesFound: 13,
      rate: 0.9230769230769231
    })
    expect(coreMock.error).not.toHaveBeenCalled()
  })

  it('sets a failed status', async () => {
    coreMock.getInput.mockReturnValue('')
    coreMock.getBooleanInput.mockReturnValue(false)
    utilMock.isErrorLike.mockReturnValue(true)

    const { run } = await import('../src/main')
    await run()
    expect(covMock.coverage).not.toHaveBeenCalled()

    expect(coreMock.setFailed).toHaveBeenNthCalledWith(
      1,
      "ENOENT: no such file or directory, open ''"
    )
    expect(coreMock.error).not.toHaveBeenCalled()
  })
})
