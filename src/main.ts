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
    const path = core.getInput('path', { required: true })
    const token = core.getInput('token', {
      required: true,
      trimWhitespace: true
    })
    const ghToken = core.getInput('gh-token')
    const shouldAddAnnotation = core.getBooleanInput('annotations') ?? false
    const threshold = Number.parseFloat(core.getInput('threshold'))
    const differenceThreshold = Number.parseFloat(
      core.getInput('difference-threshold')
    )
    const patchThreshold = Number.parseFloat(core.getInput('patch-threshold'))
    const emptyPatch = core.getBooleanInput('skip-empty-patch') ?? false

    const { summary, data: lcovFiles } = await analyze(path)
    const octokit = github.getOctokit(ghToken)
    const context = getContextInfo()

    const diffCoverage = await analyzeDiffCoverage({
      lcovFiles,
      context,
      octokit
    })

    const { rate, linesFound, linesCovered, diff } = await coverage({
      token,
      ghToken,
      summary,
      context,
      diffCoverage,
      shouldAddAnnotation,
      threshold,
      differenceThreshold,
      patchThreshold,
      emptyPatch
    })

    core.setOutput('coverage', { linesFound, linesCovered, rate })
    core.setOutput('difference', diff)
    core.setOutput('patch', {
      linesFound: diffCoverage.linesFound,
      linesCovered: diffCoverage.linesHit,
      rate: diffCoverage.linesHit / diffCoverage.linesFound
    })
  } catch (error) {
    core.debug(`${error}`)
    if (isErrorLike(error)) core.setFailed(error.message)
  }
}
