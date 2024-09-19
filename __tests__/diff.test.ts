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
          compareCommitsWithBasehead: jest.fn(async () =>
            Promise.resolve({ data: diffString })
          )
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

    expect(result.linesHit).toBe(11)
    expect(result.linesFound).toBe(12)
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
          compareCommitsWithBasehead: jest.fn(async () =>
            Promise.resolve({ data: '' })
          )
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

    expect(result.linesHit).toBe(0)
    expect(result.linesFound).toBe(0)
  })
})
