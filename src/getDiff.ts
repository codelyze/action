import axios from 'axios'
import * as fs from 'fs'

const owner = 'ymcorrea'
const repo = 'MR-V'
const fileType = 'diff'

export async function getLatestCommitSha(
  owner: string,
  repo: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits`
  try {
    const response = await axios.get(url, {
      headers: { Accept: 'application/vnd.github.v3+json' }
    })
    const commits = response.data
    if (commits.length > 0) {
      return commits[0].sha
    } else {
      console.error('No commits found.')
      return null
    }
  } catch (error) {
    console.error('Error fetching commits:', error)
    return null
  }
}

export async function getPatchOrDiff(
  owner: string,
  repo: string,
  commitSha: string,
  fileType: string
): Promise<void> {
  const url = `https://github.com/${owner}/${repo}/commit/${commitSha}.${fileType}`
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    fs.writeFileSync(`commit.${fileType}`, response.data)
    console.log(
      `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} file saved as commit.${fileType}`
    )
  } catch (error) {
    console.error(`Error fetching ${fileType} file:`, error)
  }
}
