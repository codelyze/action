import * as core from '@actions/core'
import * as github from '@actions/github'
import type { LcovSummary } from './lcov'
import * as codelyze from './codelyze'
import { createCommitStatus, percentString } from './util'
import { ContextInfo } from './types'
import { ChangeHunkSet, DiffCoverageOutput } from './diff'

interface Props {
  token: string
  ghToken: string
  summary: LcovSummary
  context: ContextInfo
  diffCoverage: DiffCoverageOutput
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
    commitDate: commit.commit.author?.date
  })
  const comparison = res?.check
  const utoken = res?.metadata?.token

  const rate = summary.lines.hit / summary.lines.found
  const diff = comparison
    ? rate - comparison.linesHit / comparison.linesFound
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
    const success = evaluateState([
      rate * 100 >= threshold,
      Math.abs(diff * 100) >= differenceThreshold // absolute value because it is diff
    ])
    const failDescription = success
      ? ''
      : `Failed to satisfy threshold: ${threshold}% and difference-threshold: ${differenceThreshold}%`
    return {
      state: toState(success),
      description: `${percentString(rate)} (${percentString(diff)}) compared to ${compareSha.slice(0, 8)}. ${failDescription}`
    }
  })()

  const { data: status } = await createCommitStatus({
    token: utoken ? utoken : ghToken,
    context,
    commitContext: 'codelyze/project',
    ...message
  })

  const { linesHit, linesFound } = diffCoverage
  const diffCoverageRate = linesHit / linesFound
  console.log(
    `diffCoverage: ${diffCoverageRate} | differenceThreshold: ${differenceThreshold}`
  )
  let diffCoverageStatus
  if (!(emptyPatch && linesFound === 0)) {
    const { data } = await createCommitStatus({
      token: utoken ? utoken : ghToken,
      context,
      commitContext: 'codelyze/patch',
      state: toState(evaluateState([diffCoverageRate * 100 >= patchThreshold])),
      description:
        linesFound > 0
          ? `${percentString(linesHit / linesFound)} of diff hit`
          : 'No diff detected'
    })
    diffCoverageStatus = data
  }

  if (shouldAddAnnotation) {
    addAnnotations(diffCoverage.uncoveredHunks)
  }

  return { status, rate, diff, diffCoverageStatus }
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
