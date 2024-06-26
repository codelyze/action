import * as lcov from '../src/lcov'

describe('lcov', () => {
  it('analyzes lcov', async () => {
    const { summary, data } = await lcov.analyze(`${__dirname}/fixture/a.info`)
    expect(summary).toEqual({
      lines: { found: 393, hit: 356 },
      functions: { found: 15, hit: 9 },
      branches: { found: 47, hit: 41 }
    })
  })
})
