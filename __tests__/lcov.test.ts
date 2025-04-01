import * as lcov from '../src/lcov'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('lcov', () => {
  it('analyzes lcov', async () => {
    const { summary } = await lcov.analyze(`${__dirname}/fixture/a.info`)
    expect(summary).toEqual({
      lines: { found: 393, hit: 356 },
      functions: { found: 15, hit: 9 },
      branches: { found: 47, hit: 41 }
    })
  })
})
