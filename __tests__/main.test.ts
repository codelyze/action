import * as core from '@actions/core'
import * as main from '../src/main'
import * as cov from '../src/coverage'
import * as diff from '../src/diff'
import * as github from '@actions/github'
import * as util from '../src/util'
import { GitHub } from '@actions/github/lib/utils'

const runMock = jest.spyOn(main, 'run')

let errorMock: jest.SpyInstance
let getInputMock: jest.SpyInstance
let setFailedMock: jest.SpyInstance
let setOutputMock: jest.SpyInstance
let coverageMock: jest.SpyInstance
let analyzeDiffCov: jest.SpyInstance
let getOctokit: jest.SpyInstance
let contextInfo: jest.SpyInstance
let getCommit: jest.SpyInstance

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    coverageMock = jest.spyOn(cov, 'coverage').mockImplementation()
    analyzeDiffCov = jest
      .spyOn(diff, 'analyzeDiffCoverage')
      .mockImplementation(async () =>
        Promise.resolve({
          newLinesCovered: 12,
          totalLines: 13
        })
      )
    getCommit = jest.fn(async () => Promise.resolve({ data: {} }))
    getOctokit = jest.spyOn(github, 'getOctokit').mockImplementation(() => {
      return {
        rest: {
          repos: {
            getCommit
          }
        }
      } as unknown as InstanceType<typeof GitHub>
    })
    contextInfo = jest.spyOn(util, 'getContextInfo').mockImplementation(() => {
      return {
        repo: 'repo',
        owner: 'owner',
        sha: 'sha',
        ref: 'ref',
        compareSha: 'compareSha'
      }
    })
    // readFile = jest.spyOn(promises, 'readFile').mockImplementation()
    // parseLcov = jest.spyOn(lcov, 'parseLcov').mockImplementation()
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
    expect(getOctokit).toHaveBeenCalled()
    expect(contextInfo).toHaveBeenCalled()
    expect(getCommit).toHaveBeenCalled()
    expect(analyzeDiffCov).toHaveBeenCalled()
    expect(coverageMock).toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenNthCalledWith(
      1,
      'percentage',
      0.905852417302799
    )
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('sets a failed status', async () => {
    getInputMock.mockImplementation(() => '')

    await main.run()
    expect(runMock).toHaveReturned()
    expect(coverageMock).not.toHaveBeenCalled()

    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      "ENOENT: no such file or directory, open ''"
    )
    expect(errorMock).not.toHaveBeenCalled()
  })
})
