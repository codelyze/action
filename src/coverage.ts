import * as core from '@actions/core'
import * as github from '@actions/github'
import type { LcovSummary } from './lcov'
import * as codelyze from './codelyze'
import { createCommitStatus, percentString } from './util'
import { ContextInfo } from './types'
import { DiffCoverageOutput } from './diff'

interface Props {
  token: string
  ghToken: string
  summary: LcovSummary
  context: ContextInfo
  diffCoverage: DiffCoverageOutput
}

export const coverage = async ({
  token,
  ghToken,
  summary,
  context,
  diffCoverage
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
    return {
      state: diff < -0.0001 ? 'failure' : 'success',
      description: `${percentString(rate)} (${percentString(diff)}) compared to ${compareSha.slice(0, 8)}`
    }
  })()

  const { data: status } = await createCommitStatus({
    token: utoken ? utoken : ghToken,
    context,
    commitContext: 'codelyze/project',
    ...message
  })

  const { linesHit, linesFound } = diffCoverage
  const { data: diffCoverageStatus } = await createCommitStatus({
    token: utoken ? utoken : ghToken,
    context,
    commitContext: 'codelyze/patch',
    state: 'success',
    description:
      linesFound > 0
        ? `${percentString(linesHit / linesFound)} of diff hit`
        : 'No diff detected'
  })

  return { status, rate, diff, diffCoverageStatus }
}
