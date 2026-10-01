import { describe, expect, it } from 'vitest'
import { buildPageTokens } from './pagination.js'

describe('buildPageTokens (3-number window)', () => {
  it('shows every page when there are three or fewer', () => {
    expect(buildPageTokens(1, 1)).toEqual([1])
    expect(buildPageTokens(2, 2)).toEqual([1, 2])
    expect(buildPageTokens(2, 3)).toEqual([1, 2, 3])
  })
  it('keeps exactly three consecutive pages centred on the current page', () => {
    expect(buildPageTokens(12, 51)).toEqual([11, 12, 13])
    expect(buildPageTokens(30, 51)).toEqual([29, 30, 31])
  })
  it('pins the window at the first and last pages', () => {
    expect(buildPageTokens(1, 51)).toEqual([1, 2, 3])
    expect(buildPageTokens(2, 51)).toEqual([1, 2, 3])
    expect(buildPageTokens(50, 51)).toEqual([49, 50, 51])
    expect(buildPageTokens(51, 51)).toEqual([49, 50, 51])
  })
  it('never emits ellipsis tokens', () => {
    for (let page = 1; page <= 20; page += 1) expect(buildPageTokens(page, 20).every((t) => typeof t === 'number')).toBe(true)
  })
})
