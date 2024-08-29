import { GitHub } from '@actions/github/lib/utils'
import { Endpoints } from '@octokit/types'

export interface ContextInfo {
  repo: string
  owner: string
  sha: string
  ref: string
  compareSha: string
}

export type Octokit = InstanceType<typeof GitHub>
export type GithubCommit =
  Endpoints['GET /repos/{owner}/{repo}/commits/{ref}']['response']['data']
