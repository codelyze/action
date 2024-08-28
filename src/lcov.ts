import lcov, { LcovFile } from 'lcov-parse'
import { readFile } from 'fs/promises'
import { getContextInfo } from './coverage'
import * as github from '@actions/github'
import parseDiff, { AddChange } from 'parse-diff'

export type LcovSummary = Record<
  'lines' | 'functions' | 'branches',
  { found: number; hit: number }
>

export const parse = async (data: string): Promise<LcovFile[]> =>
  new Promise((resolve, reject) =>
    lcov(data, (err: string | Error | null, res?: LcovFile[]) => {
      if (err) {
        return reject(err)
      }
      resolve(res ?? ([] as LcovFile[]))
    })
  )

export const summarize = (lcovData: LcovFile[]): LcovSummary => {
  const empty = { hit: 0, found: 0 }
  const keys: (keyof LcovSummary)[] = ['lines', 'functions', 'branches']
  const summary: LcovSummary = {
    lines: { ...empty },
    functions: { ...empty },
    branches: { ...empty }
  }
  for (const entry of lcovData) {
    for (const key of keys) {
      summary[key].hit += entry[key].hit
      summary[key].found += entry[key].found
    }
  }
  return summary
}

interface ParseResult {
  data: LcovFile[]
  summary: LcovSummary
  diffCoverage: {
    newLinesCovered: number
    totalLines: number
  }
}

interface AnalyzeProps {
  path: string
  ghToken: string
}

export const analyze = async ({
  path,
  ghToken
}: AnalyzeProps): Promise<ParseResult> => {
  const octokit = github.getOctokit(ghToken)
  const { repo, owner, sha } = getContextInfo()

  const result = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha
  })
  const file = await readFile(path, 'utf8')
  const data: LcovFile[] = await parse(file)
  const summary = summarize(data)
  const diffCoverage = analyzeDiffCoverage(data, result.data.toString())

  return {
    data,
    summary,
    diffCoverage
  }
}

export const analyzeDiffCoverage = (
  lcovFiles: LcovFile[],
  diffString: string
) => {
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
  return { newLinesCovered, totalLines }
}
