import * as core from '@actions/core'
import * as github from '@actions/github'
import type { Lcov, LcovSummary } from './lcov'
import * as codelyze from './codelyze'
import { createCommitStatus, percentString } from './util'
import { ContextInfo } from './types'
import { ChangeHunkSet, DiffCoverageOutput } from './diff'

interface Props {
  token: string
  ghToken: string
  summary: LcovSummary
  data: Lcov
  context: ContextInfo
  diffCoverage: DiffCoverageOutput | null
  shouldAddAnnotation: boolean
  threshold: number
  differenceThreshold: number
  patchThreshold: number
  emptyPatch: boolean
}

export const coverage = async ({
  token,
  ghToken,
  summary,
  data,
  context,
  diffCoverage,
  shouldAddAnnotation = true,
  threshold = 0,
  differenceThreshold = 0,
  patchThreshold = 0,
  emptyPatch = false
}: Props) => {
  const octokit = github.getOctokit(ghToken)
  const { repo, owner, ref, sha, compareSha } = context
  const hasDiff = diffCoverage !== null
  const {
    linesHit = 0,
    linesFound = 0,
    uncoveredHunks = []
  } = diffCoverage ?? ({} as DiffCoverageOutput)

  const { data: commit } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha
  })
  const res = await codelyze.coverage({
    token,
    owner,
    repo,
    branch: ref?.replace('refs/heads/', ''),
    commit: sha,
    compareSha,
    linesFound: summary.lines.found,
    linesHit: summary.lines.hit,
    functionsFound: summary.functions.found,
    functionsHit: summary.functions.hit,
    branchesFound: summary.branches.found,
    branchesHit: summary.branches.hit,
    authorName: commit.commit.author?.name || undefined,
    authorEmail: commit.commit.author?.email || undefined,
    commitDate: commit.commit.author?.date,
    data
  })
  const comparison = res?.check
  const utoken = res?.metadata?.token

  const rate = summary.lines.hit / summary.lines.found
  // Round to 4 decimal places (2dp in percentage) to avoid floating-point
  // noise causing false failures when coverage is effectively unchanged.
  // This matches the precision used by percentString for display.
  const diff = comparison
    ? Math.round((rate - comparison.linesHit / comparison.linesFound) * 1e4) /
      1e4
    : undefined

  core.debug(`rate: ${rate}`)
  core.debug(`diff: ${diff}`)

  const message = ((): {
    state: 'success' | 'failure'
    description: string
  } => {
    if (diff == null) {
      return {
        state: 'success',
        description: `${percentString(rate)} coverage`
      }
    }
    const failures: string[] = []
    if (rate * 100 < threshold) {
      failures.push(`threshold (${(rate * 100).toFixed(2)}% < ${threshold}%)`)
    }
    if (diff * 100 < -differenceThreshold) {
      failures.push(
        `difference-threshold (${(diff * 100).toFixed(2)}% < -${differenceThreshold}%)`
      )
    }
    const success = failures.length === 0
    const failDescription = success ? '' : `Failed: ${failures.join('; ')}`
    return {
      state: toState(success),
      description: `${percentString(rate)} (${percentString(diff)}) compared to ${(compareSha ?? 'unknown').slice(0, 8)}. ${failDescription}`
    }
  })()

  const { data: status } = await createCommitStatus({
    token: utoken ? utoken : ghToken,
    context,
    commitContext: 'codelyze/project',
    ...message
  })

  const diffCoverageRate = linesFound > 0 ? linesHit / linesFound : 0

  let diffCoverageStatus
  if (hasDiff && !(emptyPatch && linesFound === 0)) {
    const { data: commitStatusData } = await createCommitStatus({
      token: utoken ? utoken : ghToken,
      context,
      commitContext: 'codelyze/patch',
      state: toState(evaluateState([diffCoverageRate * 100 >= patchThreshold])),
      description:
        linesFound > 0
          ? `${percentString(linesHit / linesFound)} of diff hit`
          : 'No diff detected'
    })
    diffCoverageStatus = commitStatusData
  }

  if (shouldAddAnnotation && hasDiff) {
    addAnnotations(uncoveredHunks)
  }

  return {
    status,
    rate,
    diff,
    diffCoverageStatus,
    linesFound,
    linesCovered: linesHit
  }
}

const evaluateState = (conditions: boolean[]) => conditions.every(Boolean)
const toState = (success: boolean) => (success ? 'success' : 'failure')

export const addAnnotations = async (hunkSet: ChangeHunkSet[]) => {
  for (const file of hunkSet) {
    for (const hunk of file.hunks) {
      core.warning('This hunk is not covered', {
        file: file.file,
        startLine: hunk.start,
        endLine: hunk.end
      })
    }
  }
}
