import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export const getDiff = async (base: string, head: string): Promise<string> => {
  const { stdout } = await execPromise(`git diff ${base} ${head}`)
  return stdout
}

export const parseDiff = (diff: string): string[] => {
  const addedLines = diff
    .split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.slice(1).trim()) // Remove the '+' and trim spaces
  return addedLines
}
