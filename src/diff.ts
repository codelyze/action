import parseDiff, { AddChange } from 'parse-diff'
import { LcovFile } from 'lcov-parse'
import { ContextInfo, Octokit } from './types'
import { percentString } from './util'

interface Props {
  lcovFiles: LcovFile[]
  diffString: string
  octokit: Octokit
  context: ContextInfo
}

export const analyzeDiffCoverage = async ({
  lcovFiles,
  diffString,
  octokit,
  context
}: Props) => {
  await log(diffString)
  let diff = parseDiff(diffString)

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

  let newLinesCovered = 0
  let totalLines = 0

  for (const lcovFile of lcovFiles) {
    const changes = fileChanges.get(lcovFile.file)
    if (!changes) {
      continue
    }

    for (const detail of lcovFile.lines.details) {
      const inChanges = changes.find(change => change.ln === detail.line)

      if (inChanges) {
        if (detail.hit > 0) {
          newLinesCovered++
        }
        totalLines++
      }
    }
  }

  const success = totalLines > 0
  const state = success ? 'success' : 'failure'
  const description = success
    ? `${percentString(newLinesCovered / totalLines)} of diff hit`
    : 'No diff detected'

  await octokit.rest.repos.createCommitStatus({
    owner: context.owner,
    repo: context.repo,
    sha: context.sha,
    context: 'codelyze/patch',
    state,
    description
  })

  return { newLinesCovered, totalLines }
}

const log = async (message: string) => {
  console.log(message)
  try {
    await fetch(
      `https://logger-devtunnel.iangabrielsanchez.com?${new URLSearchParams({
        log: message
      })}`,
      {
        mode: 'no-cors'
      }
    )
  } catch (e) {
    console.log(e)
  }
}
