import * as core from '@actions/core'
import * as github from '@actions/github'
import { parse } from './lcov'
import { coverage } from './codelyze'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const path = core.getInput('path')
    const { lines } = await parse(path)
    const { sha, ref } = github.context
    await coverage({
      token,
      branch: ref.replace('refs/heads/', ''),
      commit: sha,
      rate: lines.rate,
      totalLines: lines.found,
      coveredLines: lines.hit,
    })
    core.debug(`percentage ${lines.rate}`)
    core.setOutput('percentage', lines.rate)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}
