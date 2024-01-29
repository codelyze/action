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

export const calculate = (
  lcovData: LcovFile[]
): { hit: number; found: number; rate: number } => {
  let hit = 0
  let found = 0
  for (const entry of lcovData) {
    hit += entry.lines.hit
    found += entry.lines.found
  }
  return {
    hit,
    found,
    rate: hit / found
  }
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
  lines: { hit: number; found: number; rate: number }
}

export const parse = async (path: string): Promise<ParseResult> => {
  let file
  try {
    file = await readFile(path, 'utf8')
  } catch (e) {
    throw new Error('Failed to load file')
  }
  const data = await parseLcov(file)
  const byFile = groupByFile(data)
  const lines = calculate(data)

  return {
    data,
    byFile,
    lines
  }
}
