// At most `size` consecutive page numbers around the current page (no ellipses),
// e.g. 1 of 51 -> [1, 2, 3], 12 of 51 -> [11, 12, 13], 51 of 51 -> [49, 50, 51].
export function buildPageTokens(currentPage, totalPages, size = 3) {
  const count = Math.min(size, Math.max(totalPages, 0))
  if (count === 0) return []
  const start = Math.min(Math.max(currentPage - Math.floor(count / 2), 1), totalPages - count + 1)
  return Array.from({ length: count }, (_, index) => start + index)
}

// "View More" lists rather than numbered pages: only the first `pageSize`
// records are painted until the reader expands the list, after which every
// record in the original list is shown. The same records are used in both
// states, so nothing is duplicated or dropped and no selection is lost.
export function paginateViewMore(items = [], { expanded = false, pageSize = 6 } = {}) {
  const list = Array.isArray(items) ? items : []
  if (expanded) return list
  const limit = Math.max(Number(pageSize) || 0, 0)
  return list.slice(0, limit)
}
