import { GitHub } from '@actions/github/lib/utils'

export interface ContextInfo {
  repo: string
  owner: string
  sha: string
  ref: string
  compareSha: string
}

export type Octokit = InstanceType<typeof GitHub>

export type CreateCommitStatusProps = {
  token: string
  context: ContextInfo
  commitContext: string
  state: 'failure' | 'success'
  description: string
}

export type CommitStatusResponse = {
  url: string
  avatar_url: string
  id: number
  node_id: string
  state: string
  description: string
  target_url: string
  context: string
  created_at: string
  updated_at: string
  creator: {
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: 'User'
    site_admin: boolean
  }
}
