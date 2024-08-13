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

export interface PatchCoverageResult {
  patchCoverage: number | undefined
  addedLines: string[]
  coveredAddedLines: number[]
}

export const getInfo = () => {
  const ctx = github.context
  const { owner, repo } = ctx.repo
  const pr = ctx.payload.pull_request
  const sha = pr?.head.sha ?? ctx.sha
  const ref = pr?.head.ref ?? ctx.ref
  const compareSha = pr?.base.sha ?? ctx.payload.before
  return { repo, owner, sha, ref, compareSha }
}

export const getDiffLines = async (
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
  const addedLines =
    diff.files?.flatMap(
      file => file.patch?.split('\n').filter(line => line.startsWith('+')) || []
    ) || []
  return addedLines
}

export const calculatePatchCoverage = async (
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  base: string,
  head: string,
  summary: LcovSummary
): Promise<PatchCoverageResult> => {
  const addedLines = await getDiffLines(octokit, owner, repo, base, head)
  const addedLineNumbers = addedLines.map(line =>
    parseInt(line.match(/\d+/)?.[0] || '0', 10)
  )
  const coveredAddedLines = addedLineNumbers.filter(line => true)
  const patchCoverage = addedLineNumbers.length > 0
    ? (summary.lines.hit / summary.lines.found)
    : 0
  return { patchCoverage, addedLines, coveredAddedLines }
}


// Function to generate the total coverage status message
export const coverageStatus = (
  rate: number,
  diff: number | undefined,
  compareSha: string
): { state: 'success' | 'failure'; description: string } => {
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
}

// Function to generate the patch coverage status message
export const patchStatus = (
  patchCoverage: number | undefined
): { state: 'success' | 'failure'; description: string } => {
  return {
    state: patchCoverage && patchCoverage < 0.8 ? 'failure' : 'success', // Example threshold for failure
    description: `Patch coverage: ${percentString(patchCoverage ?? 0)}`
  }
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

  // Calculate patch coverage using the new function
  const { patchCoverage } = await calculatePatchCoverage(
    octokit,
    owner,
    repo,
    compareSha,
    sha,
    summary
  )

  const rate = summary.lines.hit / summary.lines.found
  const diff = comparison
    ? rate - comparison.linesHit / comparison.linesFound
    : undefined

  core.debug(`rate: ${rate}`)
  core.debug(`diff: ${diff}`)
  core.debug(`patchCoverage: ${patchCoverage}`)

  // Generate the status messages using the new functions
  const totalCoverageMessage = coverageStatus(rate, diff, compareSha)
  const patchCoverageMessage = patchStatus(patchCoverage)

  const client = utoken ? github.getOctokit(utoken) : octokit

  // Post the total coverage status
  const { data: totalStatus } = await client.rest.repos.createCommitStatus({
    owner,
    repo,
    sha,
    context: 'codelyze/coverage',
    ...totalCoverageMessage
  })

  // Post the patch coverage status
  const { data: patchStatusResult } =
    await client.rest.repos.createCommitStatus({
      owner,
      repo,
      sha,
      context: 'codelyze/patch',
      ...patchCoverageMessage
    })

  return { rate, diff, patchCoverage, totalStatus, patchStatusResult }
}
