// At most `size` consecutive page numbers around the current page (no ellipses),
// e.g. 1 of 51 -> [1, 2, 3], 12 of 51 -> [11, 12, 13], 51 of 51 -> [49, 50, 51].
export function buildPageTokens(currentPage, totalPages, size = 3) {
  const count = Math.min(size, Math.max(totalPages, 0))
  if (count === 0) return []
  const start = Math.min(Math.max(currentPage - Math.floor(count / 2), 1), totalPages - count + 1)
  return Array.from({ length: count }, (_, index) => start + index)
}
