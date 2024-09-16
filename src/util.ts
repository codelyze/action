import * as github from '@actions/github'
import { CreateCommitStatusProps } from './types'
export const percentString = (value: number, lang?: string): string =>
  new Intl.NumberFormat(lang, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)

interface ErrorLike {
  message: string
}

export const isErrorLike = (v: unknown): v is ErrorLike => {
  if (!v) return false
  if (typeof v === 'object') {
    return 'message' in v && typeof v['message'] == 'string'
  }
  return false
}

export const getContextInfo = () => {
  const ctx = github.context
  const { owner, repo } = ctx.repo
  const pr = ctx.payload.pull_request
  const sha = pr?.head.sha ?? ctx.sha
  const ref = pr?.head.ref ?? ctx.ref
  const compareSha = pr?.base.sha ?? ctx.payload.before
  return { repo, owner, sha, ref, compareSha }
}

export const createCommitStatus = async (props: CreateCommitStatusProps) => {
  const client = github.getOctokit(props.token)
  const context = props.context

  return await client.rest.repos.createCommitStatus({
    owner: context.owner,
    repo: context.repo,
    sha: context.sha,
    context: props.commitContext,
    state: props.state,
    description: props.description
  })
}
