# codelyze/action

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
![Coverage](https://api.codelyze.com/v1/projects/badge/clb_d6da3631ad505ccb1e07b10e4a5d69cb?r=1)

A GitHub action to upload coverage to codelyze.com.

## Usage

```yml
- name: Upload coverage
  uses: codelyze/action@2.1.0
  with:
    token: ${{ secrets.CODELYZE_TOKEN }}
    path: coverage/lcov.info
```

### Permission

The following workflow permissions are necessary:

```yml
permissions:
  contents: read
  statuses: write
```

### Inputs

`codelyze/action` uses the following inputs:

| Name                   | Description                                                                                                                                                                                                              | Required | Default        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------- |
| `token`                | Coverage upload token generated when project is created on codelyze.com                                                                                                                                                  | yes      |                |
| `path`                 | Relative path to the coverage file                                                                                                                                                                                       | yes      |                |
| `gh-token`             | `GITHUB_TOKEN` (permissions `contents: write` and `pull-requests: write`) or a `repo` scoped [Personal Access Token (PAT)](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token). | no       | `GITHUB_TOKEN` |
| `threshold`            | The minimum coverage allowed. If coverage is lower than this, the action will fail                                                                                                                                       | no       |
| `difference-threshold` | The minimum total difference allowed between the current commit and the reference one                                                                                                                                    | no       |
| `patch-threshold`      | the minimum value for patch coverage: the minimum ratio of new lines that are not covered.                                                                                                                               | no       |
| `empty-patch`          | If true don't even add a commit status for a patch that has no changes.                                                                                                                                                | no       |

### Outputs

`codelyze/action` has the following outputs:

| Name         | Description               |
| ------------ | ------------------------- |
| `percentage` | Total percentage coverage |
| `diffCoverage` | 