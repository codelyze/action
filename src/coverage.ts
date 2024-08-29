import * as core from '@actions/core'
import * as github from '@actions/github'
import type { LcovSummary } from './lcov'
import * as codelyze from './codelyze'
import { percentString } from './util'
import { ContextInfo } from './types'
import { Endpoints } from '@octokit/types'
import { GitHub } from '@actions/github/lib/utils'

interface Props {
  token: string
  context: ContextInfo
  summary: LcovSummary
  commit: Endpoints['GET /repos/{owner}/{repo}/commits/{ref}']['response']['data']
  octokit: InstanceType<typeof GitHub>
}

export const coverage = async ({
  token,
  context,
  summary,
  commit,
  octokit
}: Props) => {
  const res = await codelyze.coverage({
    token,
    owner: context.owner,
    repo: context.repo,
    branch: context.ref.replace('refs/heads/', ''),
    commit: context.sha,
    compareSha: context.compareSha,
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
      description: `${percentString(rate)} (${percentString(diff)}) compared to ${context.compareSha.slice(0, 8)}`
    }
  })()
  const client = utoken ? github.getOctokit(utoken) : octokit
  const { data: status } = await client.rest.repos.createCommitStatus({
    owner: context.owner,
    repo: context.repo,
    sha: context.sha,
    context: 'codelyze/project',
    ...message
  })

  return { status, rate, diff }
}
