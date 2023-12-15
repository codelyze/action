import * as core from '@actions/core'
import { parse } from './lcov'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // const token = core.getInput('token')
    const path = core.getInput('path')
    const { percentage } = await parse(path)
    core.debug(`percentage ${percentage}`)
    core.setOutput('percentage', percentage)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}
