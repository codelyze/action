import lcov, { LcovFile } from 'lcov-parse'
import { readFile } from 'fs/promises'

interface LcovGFile {
  file: string
  lines: number[]
}

export const parseLcov = async (data: string): Promise<LcovFile[]> =>
  new Promise((resolve, reject) =>
    lcov(data, (err: string | Error | null, res?: LcovFile[]) => {
      if (err) {
        return reject(err)
      }
      resolve(res ?? ([] as LcovFile[]))
    })
  )

export const calculate = (lcovData: LcovFile[]): number => {
  let hit = 0
  let found = 0
  for (const entry of lcovData) {
    hit += entry.lines.hit
    found += entry.lines.found
  }
  return parseFloat(((hit / found) * 100).toFixed(2))
}

const groupByFile = (lcovData: LcovFile[]): LcovGFile[] => {
  const response: LcovGFile[] = []
  for (const fileData of lcovData) {
    const lines = fileData.lines.details
      .filter(({ hit }) => hit === 0)
      .map(({ line }) => line)

    if (lines.length > 0) {
      response.push({
        file: fileData.file,
        lines
      })
    }
  }
  return response
}

interface ParseResult {
  data: LcovFile[]
  byFile: LcovGFile[]
  percentage: number
}

export const parse = async (path: string): Promise<ParseResult> => {
  const file = await readFile(path, 'utf8')
  const data = await parseLcov(file)
  const byFile = groupByFile(data)
  const percentage = calculate(data)

  return {
    data,
    byFile,
    percentage
  }
}
