import * as core from '@actions/core'
import * as github from '@actions/github'
import type { LcovSummary } from './lcov'
import * as codelyze from './codelyze'
import { percentString } from './util'
import { getDiff, parseDiff } from './diff'

interface Props {
  token: string
  ghToken: string
  summary: LcovSummary
  baseCommit: string
  headCommit: string
}

const getInfo = () => {
  const ctx = github.context
  const { owner, repo } = ctx.repo
  const pr = ctx.payload.pull_request
  const sha = pr?.head.sha ?? ctx.sha
  const ref = pr?.head.ref ?? ctx.ref
  const compareSha = pr?.base.sha ?? ctx.payload.before
  return { repo, owner, sha, ref, compareSha }
}

export const coverage = async ({
  token,
  ghToken,
  summary,
  baseCommit,
  headCommit
}: Props) => {
  const octokit = github.getOctokit(ghToken)
  const { repo, owner, ref, sha, compareSha } = getInfo()

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

  const utoken = res?.metadata?.token

  // Get the diff between commits
  const diff = await getDiff(baseCommit, headCommit)
  const addedLines = parseDiff(diff)

  // Check coverage for added lines
  const uncoveredLines = addedLines.filter(() => !summary.lines.hit) // You need to implement this check based on your coverage format
  const patchCoverageRate =
    (summary.lines.hit - uncoveredLines.length) / summary.lines.found

  const rate = summary.lines.hit / summary.lines.found
  const diffCoverageRate = patchCoverageRate // Calculate the ratio of uncovered lines

  core.debug(`rate: ${rate}`)
  core.debug(`patchCoverageRate: ${patchCoverageRate}`)

  const message = ((): {
    state: 'success' | 'failure'
    description: string
  } => {
    if (diffCoverageRate < 0.9) {
      // Example threshold
      return {
        state: 'failure',
        description: `${percentString(rate)} coverage with ${percentString(diffCoverageRate)} patch coverage`
      }
    }
    return {
      state: 'success',
      description: `${percentString(rate)} coverage with ${percentString(diffCoverageRate)} patch coverage`
    }
  })()

  const client = utoken ? github.getOctokit(utoken) : octokit
  const { data: status } = await client.rest.repos.createCommitStatus({
    owner,
    repo,
    sha,
    context: 'codelyze/project',
    ...message
  })

  return { status, rate, diffCoverageRate }
}
