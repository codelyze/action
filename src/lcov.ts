import lcov, { LcovFile } from 'lcov-parse'
import { readFile } from 'fs/promises'

interface LcovGFile {
  file: string
  lines: number[]
}

export const parseLcov = (data: string): Promise<LcovFile[]> =>
  new Promise((resolve, reject) =>
    lcov(data, (err: string | Error | null, res?: LcovFile[]) => {
      if (err) {
        return reject(err)
      }
      resolve(res ?? ([] as LcovFile[]))
    })
  )

export const calculate = (lcov: LcovFile[]): number => {
  let hit = 0
  let found = 0
  for (const entry of lcov) {
    hit += entry.lines.hit
    found += entry.lines.found
  }
  return parseFloat(((hit / found) * 100).toFixed(2))
}

const groupByFile = (lcovData: LcovFile[]) => {
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

export const parse = async (path: string) => {
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
