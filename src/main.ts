import * as core from '@actions/core'
import * as github from '@actions/github'
import { parse } from './lcov'
import { coverage } from './codelyze'

const formatDate = (): string => {
  return new Date().toISOString()
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const ghToken = core.getInput('gh-token')
    const token = core.getInput('token')
    const path = core.getInput('path')

    const octokit = github.getOctokit(ghToken)
    const { data: check } = await octokit.rest.checks.create({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      head_sha: github.context.sha,
      name: 'codelyze/project',
      started_at: formatDate()
    })
    core.debug(`percentage ${check.id}`)

    const { lines } = await parse(path)
    const { sha, ref } = github.context

    core.debug(`percentage ${lines.rate}`)
    core.setOutput('percentage', lines.rate)
    const res = await coverage({
      token,
      branch: ref.replace('refs/heads/', ''),
      commit: sha,
      rate: lines.rate,
      totalLines: lines.found,
      coveredLines: lines.hit
    })
    core.debug(`result ${res}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}
