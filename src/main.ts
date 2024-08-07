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
    const baseCommit = core.getInput('base-commit')
    const headCommit = core.getInput('head-commit')

    const { summary } = await analyze(path)

    const rate = summary.lines.hit / summary.lines.found

    let patchCoverage: number | undefined = undefined
    if (baseCommit && headCommit) {
      const diffCoverage = await coverage({ token, ghToken, summary, baseCommit, headCommit })
      patchCoverage = diffCoverage?.rate
    }

    await coverage({ token, ghToken, summary })

    core.setOutput('percentage', rate)
    if (patchCoverage !== undefined) {
      core.setOutput('patch-coverage', patchCoverage)
    }
  } catch (error) {
    core.debug(`${error}`)
    if (isErrorLike(error)) core.setFailed(error.message)
  }
}
