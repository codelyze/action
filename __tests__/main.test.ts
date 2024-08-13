import * as core from '@actions/core'
import * as main from '../src/main'
import * as cov from '../src/coverage'

const runMock = jest.spyOn(main, 'run')

let errorMock: jest.SpyInstance
let getInputMock: jest.SpyInstance
let setFailedMock: jest.SpyInstance
let setOutputMock: jest.SpyInstance
let coverageMock: jest.SpyInstance

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    coverageMock = jest.spyOn(cov, 'coverage').mockImplementation()
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

    coverageMock.mockResolvedValue({ rate: 0.5 }) // Mock patch coverage result

    await main.run()
    expect(runMock).toHaveReturned()
    expect(coverageMock).toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenNthCalledWith(
      1,
      'percentage',
      0.905852417302799
    )
    expect(setOutputMock).toHaveBeenNthCalledWith(2, 'patch-coverage', 0.5)
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
