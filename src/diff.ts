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
}

export const analyzeDiffCoverage = async ({
  lcovFiles,
  octokit,
  context
}: Props): Promise<DiffCoverageOutput> => {
  const result = await octokit.rest.repos.compareCommitsWithBasehead({
    owner: context.owner,
    repo: context.repo,
    basehead: `${context.compareSha}...${context.sha}`,
    mediaType: {
      format: 'diff'
    }
  })

  let diff = parseDiff(result.data.toString())

  diff = diff.filter(file =>
    lcovFiles.find(lcovFile => lcovFile.file === file.to)
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

  for (const lcovFile of lcovFiles) {
    const changes = fileChanges.get(lcovFile.file)
    if (!changes) {
      continue
    }

    for (const detail of lcovFile.lines.details) {
      const inChanges = changes.find(change => change.ln === detail.line)

      if (inChanges) {
        if (detail.hit > 0) {
          linesHit++
        }
        linesFound++
      }
    }
  }

  return { linesFound, linesHit }
}
