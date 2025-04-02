import * as github from '@actions/github'
import { jest } from '@jest/globals'

export const getOctokit = jest.fn<typeof github.getOctokit>()
