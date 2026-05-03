import { LcovFile } from 'lcov-parse'
import { analyzeDiffCoverage } from '../src/diff'
import { ContextInfo, Octokit } from '../src/types'
import { readFileSync } from 'fs'
import { jest } from '@jest/globals'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

jest.unstable_mockModule('@actions/core', () => ({
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  getInput: jest.fn(),
  getBooleanInput: jest.fn()
}))

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

    expect(result).not.toBeNull()
    expect(result!.linesHit).toBe(11)
    expect(result!.linesFound).toBe(12)
  })

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

    expect(result).not.toBeNull()
    expect(result!.linesHit).toBe(0)
    expect(result!.linesFound).toBe(0)
  })

  it('should return null when compareSha is undefined', async () => {
    const octokit = {
      rest: {
        repos: {
          compareCommitsWithBasehead: jest.fn()
        }
      }
    } as unknown as Octokit

    const context: ContextInfo = {
      owner: 'owner',
      repo: 'repo',
      sha: 'sha',
      ref: 'ref'
    }

    const result = await analyzeDiffCoverage({
      lcovFiles: [],
      octokit,
      context
    })

    expect(octokit.rest.repos.compareCommitsWithBasehead).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should return null when compareSha is the null SHA', async () => {
    const octokit = {
      rest: {
        repos: {
          compareCommitsWithBasehead: jest.fn()
        }
      }
    } as unknown as Octokit

    const context: ContextInfo = {
      owner: 'owner',
      repo: 'repo',
      sha: 'sha',
      ref: 'ref',
      compareSha: '0000000000000000000000000000000000000000'
    }

    const result = await analyzeDiffCoverage({
      lcovFiles: [],
      octokit,
      context
    })

    expect(octokit.rest.repos.compareCommitsWithBasehead).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should return null when compare API returns 404', async () => {
    const octokit = {
      rest: {
        repos: {
          compareCommitsWithBasehead: jest.fn(async () => {
            throw new Error(
              'Not Found - https://docs.github.com/rest/commits/commits#compare-two-commits'
            )
          })
        }
      }
    } as unknown as Octokit

    const context: ContextInfo = {
      owner: 'owner',
      repo: 'repo',
      sha: 'sha',
      ref: 'ref',
      compareSha: 'abc123'
    }

    const result = await analyzeDiffCoverage({
      lcovFiles: [],
      octokit,
      context
    })

    expect(octokit.rest.repos.compareCommitsWithBasehead).toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
