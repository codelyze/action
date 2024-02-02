import * as core from '@actions/core'
import * as github from '@actions/github'
import type { LcovSummary } from './lcov'
import * as codelyze from './codelyze'
import { percentString } from './util'

interface Props {
  token: string
  ghToken: string
  summary: LcovSummary
}

export const coverage = async ({ token, ghToken, summary }: Props) => {
  const octokit = github.getOctokit(ghToken)
  const ctx = github.context
  const { owner, repo } = ctx.repo
  const sha = ctx.payload.pull_request?.head.sha ?? ctx.sha
  const ref = ctx.payload.pull_request?.head.ref ?? ctx.ref
  const compareSha = ctx.payload.pull_request?.base.sha ?? ctx.payload.before

  core.debug(`sha: ${sha}`)
  core.debug(`ref: ${ref}`)
  core.debug(`compareSha ${compareSha}`)

  const { data: commit } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha
  })
  const comparison = await codelyze.coverage({
    token,
    branch: ref?.replace('refs/heads/', ''),
    commit: sha,
    linesFound: summary.lines.found,
    linesHit: summary.lines.hit,
    functionsFound: summary.functions.found,
    functionsHit: summary.functions.hit,
    branchesFound: summary.branches.found,
    branchesHit: summary.branches.hit,
    authorName: commit.commit.author?.name || undefined,
    authorEmail: commit.commit.author?.email || undefined,
    commitDate: commit.commit.author?.date,
    compareSha
  })

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
  const { data: status } = await octokit.rest.repos.createCommitStatus({
    owner,
    repo,
    sha,
    context: 'codelyze/project',
    ...message
  })
  core.debug(`status: ${status.id}`)

  return { status, rate, diff }
}
