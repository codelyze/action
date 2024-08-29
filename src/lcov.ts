import lcov, { LcovFile } from 'lcov-parse'
import { readFile } from 'fs/promises'

export type LcovSummary = Record<
  'lines' | 'functions' | 'branches',
  { found: number; hit: number }
>

export const parseLcov = async (data: string): Promise<LcovFile[]> =>
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
}

export const analyze = async (path: string): Promise<ParseResult> => {
  const file = await readFile(path, 'utf8')
  console.log(file)
  const data = await parseLcov(file)
  const summary = summarize(data)

  return {
    data,
    summary
  }
}
