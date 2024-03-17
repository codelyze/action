interface Coverage {
  token: string
  owner: string
  repo: string
  commit: string
  branch: string
  linesFound: number
  linesHit: number
  functionsFound: number
  functionsHit: number
  branchesFound: number
  branchesHit: number
  authorName?: string
  authorEmail?: string
  commitDate?: string
  compareSha?: string
}

interface Response {
  check?: { linesFound: number; linesHit: number }
  metadata?: { token: string }
}

export const coverage = async (cov: Coverage): Promise<Response | undefined> =>
  await (
    await fetch('https://api.codelyze.com/v1/projects/coverage', {
      method: 'POST',
      body: JSON.stringify({ ...cov, provider: 'github' }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  ).json()
