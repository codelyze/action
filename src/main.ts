import * as core from '@actions/core'
import * as github from '@actions/github'
import { analyze } from './lcov'
import { coverage } from './coverage'
import { getContextInfo, isErrorLike } from './util'
import { analyzeDiffCoverage } from './diff'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const path = core.getInput('path')
    const token = core.getInput('token')
    const ghToken = core.getInput('gh-token')

    const { summary, data: lcovFiles } = await analyze(path)
    const octokit = github.getOctokit(ghToken)
    const context = getContextInfo()

    const diffCoverage = await analyzeDiffCoverage({
      lcovFiles,
      context,
      octokit
    })

    const { rate } = await coverage({
      token,
      ghToken,
      summary,
      context,
      diffCoverage
    })

    core.setOutput('percentage', rate)
    core.setOutput(
      'diffCoverage',
      diffCoverage.linesHit / diffCoverage.linesFound
    )
  } catch (error) {
    core.debug(`${error}`)
    if (isErrorLike(error)) core.setFailed(error.message)
  }
}
