import { jest } from '@jest/globals'

import * as coreMock from './fixture/mocks/core.ts'
import * as githubMock from './fixture/mocks/github.ts'
import * as codelyzeMock from './fixture/mocks/codelyze.ts'
import * as utilMock from './fixture/mocks/util.ts'
import * as commentMock from './fixture/mocks/comment.ts'

jest.unstable_mockModule('@actions/core', () => coreMock)
jest.unstable_mockModule('@actions/github', () => githubMock)
jest.unstable_mockModule('../src/codelyze', () => codelyzeMock)
jest.unstable_mockModule('../src/util', () => utilMock)
jest.unstable_mockModule('../src/comment', () => commentMock)

describe('coverage', () => {
  const createMockContext = (): {
    repo: string
    owner: string
    sha: string
    ref: string
    compareSha: string
  } => ({
    repo: 'repo',
    owner: 'owner',
    sha: 'sha',
    ref: 'ref',
    compareSha: 'compareSha'.padEnd(40, '0')
  })

  const createMockSummary = (
    hit: number,
    found: number
  ): {
    lines: { found: number; hit: number }
    functions: { found: number; hit: number }
    branches: { found: number; hit: number }
  } => ({
    lines: { found, hit },
    functions: { found: 0, hit: 0 },
    branches: { found: 0, hit: 0 }
  })

  const createMockLcov = (): never[] => []

  const createMockDiffCoverage = (): {
    linesHit: number
    linesFound: number
    uncoveredHunks: never[]
  } => ({
    linesHit: 10,
    linesFound: 10,
    uncoveredHunks: []
  })

  beforeEach(() => {
    coreMock.setFailed.mockImplementation(() => {})
    coreMock.setOutput.mockImplementation(() => {})
    coreMock.getInput.mockReturnValue('')
    coreMock.getBooleanInput.mockReturnValue(false)

    commentMock.upsertPrComment.mockResolvedValue(undefined)
    commentMock.fetchFlagSummaries.mockResolvedValue([])

    codelyzeMock.coverage.mockResolvedValue({
      check: {
        linesHit: 50,
        linesFound: 100,
        functionsHit: 0,
        functionsFound: 0,
        branchesHit: 0,
        branchesFound: 0
      },
      metadata: { token: 'test-token' }
    })

    githubMock.getOctokit.mockReturnValue({
      rest: {
        repos: {
          getCommit: jest.fn().mockResolvedValue({
            data: {
              commit: {
                author: {
                  name: 'test',
                  email: 'test@test.com',
                  date: '2024-01-01'
                }
              },
              parents: [{ sha: 'parent-sha' }]
            }
          })
        }
      }
    } as ReturnType<typeof githubMock.getOctokit>)

    utilMock.getContextInfo.mockReturnValue(createMockContext())
    utilMock.createCommitStatus.mockResolvedValue({ data: {} })
    utilMock.percentString.mockImplementation(
      (n: number) => `${(n * 100).toFixed(2)}%`
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('difference-threshold', () => {
    it('should pass when coverage increases', async () => {
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 50,
          linesFound: 100,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(60, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 0,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false
      })

      expect(utilMock.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'success'
        })
      )
    })

    it('should fail on coverage decrease with difference-threshold: 0', async () => {
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 60,
          linesFound: 100,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(50, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 0,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false
      })

      expect(utilMock.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'failure'
        })
      )
    })

    it('should pass when coverage decrease is within threshold', async () => {
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 60,
          linesFound: 100,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(58, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 0,
        differenceThreshold: 2,
        patchThreshold: 0,
        emptyPatch: false
      })

      expect(utilMock.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'success'
        })
      )
    })

    it('should fail when coverage decrease exceeds threshold', async () => {
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 60,
          linesFound: 100,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(50, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 0,
        differenceThreshold: 5,
        patchThreshold: 0,
        emptyPatch: false
      })

      expect(utilMock.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'failure'
        })
      )
    })

    it('should pass when coverage stays the same', async () => {
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 50,
          linesFound: 100,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(50, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 0,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false
      })

      expect(utilMock.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'success'
        })
      )
    })

    it('should pass when coverage is effectively the same but computed from different denominators', async () => {
      // 150/151 = 0.99337748... vs 149/150 = 0.99333...
      // Raw diff is -0.00004415..., which would previously trigger a failure
      // due to floating-point noise despite displaying as -0%
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 150,
          linesFound: 151,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(149, 150),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 0,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false
      })

      expect(utilMock.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'success'
        })
      )
    })

    it('should combine threshold and difference-threshold checks', async () => {
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 60,
          linesFound: 100,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(55, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 60,
        differenceThreshold: 10,
        patchThreshold: 0,
        emptyPatch: false
      })

      expect(utilMock.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'failure'
        })
      )
    })

    it('should only mention threshold in failure message when only threshold fails', async () => {
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 50,
          linesFound: 100,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(50, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 60,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false
      })

      const call = utilMock.createCommitStatus.mock.calls[0][0] as {
        description: string
      }
      expect(call.description).toContain('threshold')
      expect(call.description).not.toContain('difference-threshold')
    })

    it('should only mention difference-threshold in failure message when only difference-threshold fails', async () => {
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 60,
          linesFound: 100,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(55, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 50,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false
      })

      const call = utilMock.createCommitStatus.mock.calls[0][0] as {
        description: string
      }
      expect(call.description).toContain('difference-threshold')
      expect(call.description).not.toContain('Failed: threshold')
    })

    it('should mention both thresholds in failure message when both fail', async () => {
      codelyzeMock.coverage.mockResolvedValue({
        check: {
          linesHit: 60,
          linesFound: 100,
          functionsHit: 0,
          functionsFound: 0,
          branchesHit: 0,
          branchesFound: 0
        },
        metadata: { token: 'test-token' }
      })

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(40, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 60,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false
      })

      const call = utilMock.createCommitStatus.mock.calls[0][0] as {
        description: string
      }
      expect(call.description).toContain('threshold')
      expect(call.description).toContain('difference-threshold')
    })
  })

  describe('flags', () => {
    it('forwards flag to codelyze.coverage', async () => {
      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(50, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 0,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false,
        flag: 'unit'
      })

      expect(codelyzeMock.coverage).toHaveBeenCalledWith(
        expect.objectContaining({ flag: 'unit' })
      )
    })

    it('forwards parentShas to codelyze.coverage', async () => {
      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(50, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 0,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false
      })

      expect(codelyzeMock.coverage).toHaveBeenCalledWith(
        expect.objectContaining({ parentShas: ['parent-sha'] })
      )
    })

    it('posts a commit status for each flag returned by fetchFlagSummaries', async () => {
      commentMock.fetchFlagSummaries.mockResolvedValue([
        {
          flagName: 'unit',
          linesHit: 80,
          linesFound: 100,
          carryforward: false
        },
        { flagName: 'e2e', linesHit: 40, linesFound: 50, carryforward: true }
      ])

      const { coverage } = await import('../src/coverage')
      await coverage({
        token: 'test',
        ghToken: 'gh-test',
        summary: createMockSummary(50, 100),
        data: createMockLcov(),
        context: createMockContext(),
        diffCoverage: createMockDiffCoverage(),
        shouldAddAnnotation: false,
        threshold: 0,
        differenceThreshold: 0,
        patchThreshold: 0,
        emptyPatch: false
      })

      expect(utilMock.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({ commitContext: 'codelyze/unit' })
      )
      expect(utilMock.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({ commitContext: 'codelyze/e2e' })
      )
    })
  })
})
