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

const getInfo = () => {
  const ctx = github.context
  const { owner, repo } = ctx.repo
  const pr = ctx.payload.pull_request
  const sha = pr?.head.sha ?? ctx.sha
  const ref = pr?.head.ref ?? ctx.ref
  const compareSha = pr?.base.sha ?? ctx.payload.before
  return { repo, owner, sha, ref, compareSha }
}

const getDiffLines = async (
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  base: string,
  head: string
) => {
  const { data: diff } = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base,
    head
  })
  const addedLines = diff.files?.flatMap(file => file.patch?.split('\n').filter(line => line.startsWith('+')) || []) || []
  return addedLines
}

export const coverage = async ({ token, ghToken, summary }: Props) => {
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
  const comparison = res?.check
  const utoken = res?.metadata?.token

  let patchCoverage: number | undefined
  const addedLines = await getDiffLines(octokit, owner, repo, compareSha, sha)
  const addedLineNumbers = addedLines.map(line => parseInt(line.match(/\d+/)?.[0] || '0', 10))
  const coveredAddedLines = addedLineNumbers.filter(line => summary.lines.found > line) // Simplified coverage check
  patchCoverage = coveredAddedLines.length / addedLineNumbers.length

  const rate = summary.lines.hit / summary.lines.found
  const diff = comparison ? rate - (comparison.linesHit / comparison.linesFound) : undefined

  core.debug(`rate: ${rate}`)
  core.debug(`diff: ${diff}`)
  core.debug(`patchCoverage: ${patchCoverage}`)

  const message = ((): {
    state: 'success' | 'failure'
    description: string
  } => {
    if (diff == null) {
      return {
        state: 'success',
        description: `${percentString(rate)} coverage, patch coverage: ${percentString(patchCoverage ?? 0)}`
      }
    }
    return {
      state: diff < -0.0001 ? 'failure' : 'success',
      description: `${percentString(rate)} (${percentString(diff)}) compared to ${compareSha.slice(0, 8)}, patch coverage: ${percentString(patchCoverage ?? 0)}`
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

  return { status, rate, diff, patchCoverage }
}
