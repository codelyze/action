import * as core from '@actions/core'
import parseDiff, { AddChange } from 'parse-diff'
import { LcovFile } from 'lcov-parse'
import { ContextInfo, Octokit } from './types'

interface Props {
  lcovFiles: LcovFile[]
  octokit: Octokit
  context: ContextInfo
}

export interface DiffCoverageOutput {
  linesHit: number
  linesFound: number
  uncoveredHunks: ChangeHunkSet[]
}

export interface ChangeHunkSet {
  file: string
  hunks: {
    start?: number
    end?: number
  }[]
}

const NULL_SHA = '0000000000000000000000000000000000000000'

export const analyzeDiffCoverage = async ({
  lcovFiles,
  octokit,
  context
}: Props): Promise<DiffCoverageOutput | null> => {
  if (!context.compareSha || context.compareSha === NULL_SHA) {
    core.warning(
      `No comparison target available (compareSha: ${context.compareSha ?? 'undefined'}). Skipping diff coverage analysis.`
    )
    return null
  }

  let result
  try {
    result = await octokit.rest.repos.compareCommitsWithBasehead({
      owner: context.owner,
      repo: context.repo,
      basehead: `${context.compareSha}...${context.sha}`,
      mediaType: {
        format: 'diff'
      }
    })
  } catch (error) {
    core.debug(`${error}`)
    core.warning(
      `Failed to compare commits (${context.compareSha}...${context.sha}): ${error instanceof Error ? error.message : String(error)}. Skipping diff coverage analysis.`
    )
    return null
  }

  let diff = parseDiff(result.data.toString())

  diff = diff.filter((file) =>
    lcovFiles.find((lcovFile) => lcovFile.file === file.to)
  )

  const fileChanges: Map<string, AddChange[]> = new Map()

  for (const file of diff) {
    for (const chunk of file.chunks) {
      for (const change of chunk.changes) {
        if (change.type === 'add') {
          const changes = fileChanges.get(file.to!) ?? []
          changes.push(change)
          fileChanges.set(file.to!, changes)
        }
      }
    }
  }

  let linesHit = 0
  let linesFound = 0

  const uncoveredHunks: ChangeHunkSet[] = []

  for (const lcovFile of lcovFiles) {
    const changes = fileChanges.get(lcovFile.file)
    if (!changes) {
      continue
    }

    const set: ChangeHunkSet = {
      file: lcovFile.file,
      hunks: []
    }
    let coveredOrSkipped = false
    for (const detail of lcovFile.lines.details) {
      const inChanges = changes.find((change) => change.ln === detail.line)

      if (inChanges) {
        if (detail.hit > 0) {
          coveredOrSkipped = true
          linesHit++
        } else if (coveredOrSkipped) {
          coveredOrSkipped = false
          set.hunks.push({
            start: inChanges.ln
          })
        } else if (!coveredOrSkipped) {
          coveredOrSkipped = false
          const last = set.hunks.length - 1
          if (last >= 0) {
            set.hunks[last].end = inChanges.ln
          }
        }
        linesFound++
      } else {
        coveredOrSkipped = true
      }
    }

    if (set.hunks.length > 0) {
      uncoveredHunks.push(set)
    }
  }

  return { linesFound, linesHit, uncoveredHunks }
}
