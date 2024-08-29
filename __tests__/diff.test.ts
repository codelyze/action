import { LcovFile } from 'lcov-parse'
import { analyzeDiffCoverage } from '../src/diff'
import { ContextInfo, Octokit } from '../src/types'
import { readFileSync } from 'fs'

describe('diff', () => {
  it('should correctly calculate coverage percentage for added lines in diff', async () => {
    const diffString = readFileSync(
      `${__dirname}/fixture/diff/diff.diff`,
      'utf-8'
    )
    const lcovRaw = readFileSync(
      `${__dirname}/fixture/diff/parsedLcov.json`,
      'utf-8'
    )
    const lcovFiles: LcovFile[] = JSON.parse(lcovRaw)

    const octokit = {
      rest: {
        repos: {
          createCommitStatus: jest.fn(),
          getCommit: jest.fn(async () => Promise.resolve({ data: diffString }))
        }
      }
    } as unknown as Octokit

    const context: ContextInfo = {
      owner: 'owner',
      repo: 'repo',
      sha: 'sha',
      ref: 'ref',
      compareSha: 'compareSha'
    }

    const result = await analyzeDiffCoverage({
      lcovFiles,
      octokit,
      context
    })

    expect(result.newLinesCovered).toBe(11)
    expect(result.totalLines).toBe(12)
    expect(octokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      sha: 'sha',
      context: 'codelyze/patch',
      state: 'success',
      description: '91.67% of diff hit'
    })
  })

  // Handles empty diffString gracefully
  it('should handle empty diffString gracefully', async () => {
    const lcovFiles = [
      {
        file: 'file1.js',
        lines: {
          details: [
            { line: 1, hit: 1 },
            { line: 2, hit: 0 },
            { line: 3, hit: 1 }
          ]
        }
      }
    ] as LcovFile[]
    const octokit = {
      rest: {
        repos: {
          createCommitStatus: jest.fn(),
          getCommit: jest.fn(async () => Promise.resolve({ data: '' }))
        }
      }
    } as unknown as Octokit

    const context: ContextInfo = {
      owner: 'owner',
      repo: 'repo',
      sha: 'sha',
      ref: 'ref',
      compareSha: 'compareSha'
    }

    const result = await analyzeDiffCoverage({
      lcovFiles,
      octokit,
      context
    })

    expect(result.newLinesCovered).toBe(0)
    expect(result.totalLines).toBe(0)
    expect(octokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      sha: 'sha',
      context: 'codelyze/patch',
      state: 'failure',
      description: 'No diff detected'
    })
  })
})
