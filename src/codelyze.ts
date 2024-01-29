interface Coverage {
  token: string
  commit: string
  branch: string
  rate: number
  totalLines: number
  coveredLines: number
}

export const coverage = (cov: Coverage) =>
  fetch('https://api.codelyze.com/v1/projects/coverage', {
    method: 'POST',
    body: JSON.stringify(cov),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(r => r.json())
