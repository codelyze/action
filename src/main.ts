import * as core from '@actions/core'
import { analyze } from './lcov'
import { coverage } from './coverage'
import { isErrorLike } from './util'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const path = core.getInput('path')
    const token = core.getInput('token')
    const ghToken = core.getInput('gh-token')

    const { summary } = await analyze(path)

    const rate = summary.lines.hit / summary.lines.found
    await coverage({ token, ghToken, summary })

    core.setOutput('percentage', rate)
  } catch (error) {
    if (isErrorLike(error)) core.setFailed(error.message)
  }
}
