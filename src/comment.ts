import type { Octokit } from './types'
import { percentString } from './util'
import type { ContextInfo } from './types'

const MARKER = '<!-- codelyze-coverage-comment -->'

interface FlagSummary {
  flagName: string
  linesHit: number
  linesFound: number
  carryforward: boolean
}

export const upsertPrComment = async ({
  octokit,
  context,
  token,
  commit,
  branch,
  overallHit,
  overallFound,
  diff
}: {
  octokit: Octokit
  context: ContextInfo
  token: string
  commit: string
  branch: string
  overallHit: number
  overallFound: number
  diff?: number
}): Promise<void> => {
  // Only comment on PRs
  const prNumber = getPrNumber()
  if (!prNumber) return

  // Fetch per-flag summaries from backend
  const flags = await fetchFlagSummaries({ token, commit, branch })

  const body = renderComment({ flags, overallHit, overallFound, commit, diff })

  // Find existing comment to upsert (paginate to handle PRs with many comments)
  const allComments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner: context.owner,
    repo: context.repo,
    issue_number: prNumber,
    per_page: 100
  })

  const existing = allComments.find((c) => c.body?.includes(MARKER))

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner: context.owner,
      repo: context.repo,
      comment_id: existing.id,
      body
    })
  } else {
    await octokit.rest.issues.createComment({
      owner: context.owner,
      repo: context.repo,
      issue_number: prNumber,
      body
    })
  }
}

const getPrNumber = (): number | undefined => {
  const ref = process.env.GITHUB_REF ?? ''
  const match = ref.match(/refs\/pull\/(\d+)\//)
  return match ? Number(match[1]) : undefined
}

export const fetchFlagSummaries = async ({
  token,
  commit,
  branch
}: {
  token: string
  commit: string
  branch: string
}): Promise<FlagSummary[]> => {
  try {
    const params = new URLSearchParams({ commit, branch })
    const res = await fetch(
      `https://api.codelyze.com/v1/projects/coverage/flags?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return []
    return (await res.json()) as FlagSummary[]
  } catch {
    return []
  }
}

const renderComment = ({
  flags,
  overallHit,
  overallFound,
  commit,
  diff
}: {
  flags: FlagSummary[]
  overallHit: number
  overallFound: number
  commit: string
  diff?: number
}): string => {
  const overallRate = overallFound > 0 ? overallHit / overallFound : 0
  const sha = commit.slice(0, 8)

  const rows = flags
    .map((f) => {
      const rate = f.linesFound > 0 ? f.linesHit / f.linesFound : 0
      const cf = f.carryforward ? ' _(cf)_' : ''
      const safeName = f.flagName.replace(/[|\n\r`]/g, ' ').trim()
      return `| \`${safeName}\`${cf} | ${f.linesHit}/${f.linesFound} | ${percentString(rate)} |`
    })
    .join('\n')

  const flagTable =
    flags.length > 0
      ? `| Flag | Lines | Coverage |\n| --- | --- | --- |\n${rows}\n`
      : ''

  return `${MARKER}
## Coverage report for ${sha}

| | Lines | Coverage |
| --- | --- | --- |
| **Overall** | ${overallHit}/${overallFound} | **${percentString(overallRate)}**${diff != null ? ` (${percentString(diff)})` : ''} |

${flagTable}
<sub>_cf = carried forward from a previous commit_</sub>`
}
