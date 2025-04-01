import * as core from '@actions/core'
import * as main from '../src/main'
import * as cov from '../src/coverage'
import * as diff from '../src/diff'
import * as github from '@actions/github'
import * as util from '../src/util'
import { CommitStatusResponse } from '../src/types'
import { jest } from '@jest/globals'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const runMock = jest.spyOn(main, 'run')

let errorMock: jest.SpyInstance
let getInputMock: jest.SpyInstance
let getBooleanInputMock: jest.SpyInstance
let setFailedMock: jest.SpyInstance
let setOutputMock: jest.SpyInstance
let coverageMock: jest.SpyInstance
let analyzeDiffCov: jest.SpyInstance

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    getBooleanInputMock = jest
      .spyOn(core, 'getBooleanInput')
      .mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    coverageMock = jest.spyOn(cov, 'coverage').mockImplementation(async () => {
      return {
        rate: 0.9,
        diff: 0.9,
        status: {} as CommitStatusResponse,
        diffCoverageStatus: {} as CommitStatusResponse,
        linesFound: 10,
        linesCovered: 9
      }
    })
    analyzeDiffCov = jest
      .spyOn(diff, 'analyzeDiffCoverage')
      .mockImplementation(async () =>
        Promise.resolve({
          linesHit: 12,
          linesFound: 13,
          uncoveredHunks: []
        })
      )
    jest.spyOn(github, 'getOctokit').mockImplementation()
    jest.spyOn(util, 'getContextInfo').mockImplementation(() => {
      return {
        repo: 'repo',
        owner: 'owner',
        sha: 'sha',
        ref: 'ref',
        compareSha: 'compareSha'
      }
    })
  })

  it('sets the output', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'path':
          return `${__dirname}/fixture/a.info`
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(analyzeDiffCov).toHaveBeenCalled()
    expect(coverageMock).toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'coverage', {
      linesCovered: 9,
      linesFound: 10,
      rate: 0.9
    })
    expect(setOutputMock).toHaveBeenNthCalledWith(2, 'difference', 0.9)
    expect(setOutputMock).toHaveBeenNthCalledWith(3, 'patch', {
      linesCovered: 12,
      linesFound: 13,
      rate: 0.9230769230769231
    })
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('sets a failed status', async () => {
    getInputMock.mockImplementation(() => '')
    getBooleanInputMock.mockImplementation(() => '')

    await main.run()
    expect(runMock).toHaveReturned()
    // expect(analyzeDiffCov).toHaveBeenCalled()
    expect(coverageMock).not.toHaveBeenCalled()

    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      "ENOENT: no such file or directory, open ''"
    )
    expect(errorMock).not.toHaveBeenCalled()
  })
})
