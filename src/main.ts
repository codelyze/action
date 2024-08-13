import * as core from '@actions/core'
import { analyze } from './lcov'
import { coverage } from './coverage'
import { isErrorLike } from './util'

export async function run(): Promise<void> {
  try {
    const path = core.getInput('path')
    const token = core.getInput('token')
    const ghToken = core.getInput('gh-token')
    const baseCommit = core.getInput('base-commit')
    const headCommit = core.getInput('head-commit')

    const { summary } = await analyze(path)

    const rate = summary.lines.hit / summary.lines.found
    await coverage({ token, ghToken, summary, baseCommit, headCommit })

    core.setOutput('percentage', rate)
  } catch (error) {
    core.debug(`${error}`)
    if (isErrorLike(error)) core.setFailed(error.message)
  }
}
