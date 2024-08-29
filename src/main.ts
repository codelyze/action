import * as core from '@actions/core'
import * as github from '@actions/github'
import { analyze, parseLcov } from './lcov'
import { coverage } from './coverage'
import { getContextInfo, isErrorLike } from './util'
import { analyzeDiffCoverage } from './diff'
import { readFile } from 'fs/promises'

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
    console.log(2)
    const octokit = github.getOctokit(ghToken)
    console.log(3)
    const context = getContextInfo()
    console.log(4)

    const result = await octokit.rest.repos.getCommit({
      owner: context.owner,
      repo: context.repo,
      ref: context.sha
    })

    const lcovString = await readFile(path, 'utf8')
    const parsedLcov = await parseLcov(lcovString)
    console.log(5)
    const { newLinesCovered, totalLines } = await analyzeDiffCoverage({
      lcovFiles: parsedLcov,
      diffString: result.data.toString(),
      context,
      octokit
    })
    console.log(6)
    const rate = summary.lines.hit / summary.lines.found
    await coverage({ token, context, summary, commit: result.data, octokit })

    core.setOutput('percentage', rate)
    core.setOutput('diffCoverage', newLinesCovered / totalLines)
  } catch (error) {
    core.debug(`${error}`)
    if (isErrorLike(error)) core.setFailed(error.message)
  }
}
