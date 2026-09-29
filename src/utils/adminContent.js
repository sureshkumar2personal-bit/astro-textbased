import { mockAstrologers } from '../data/notificationData.js'
import { sortByDateDesc } from './date.js'

// Pure selectors for the Admin -> Content Management module.
//
// The app has exactly one managed content store: astrologerPosts in
// AppDataContext, persisted to astroconnect-astrologer-posts and written by
// createPost / updatePost / deletePost. There is no banner, article,
// announcement or FAQ store anywhere in the project, so none is listed here.
//
// Posts are read through that store. Nothing is created, edited or removed.

const ASTROLOGER_NAMES = new Map(mockAstrologers.map((astrologer) => [astrologer.id, astrologer.name]))

// The only content type that exists in this app.
export const CONTENT_TYPE_POST = 'Post'

export function selectAdminContent(posts) {
  return (Array.isArray(posts) ? posts : []).map((post) => ({
    ...post,
    type: CONTENT_TYPE_POST,
    astrologerName: ASTROLOGER_NAMES.get(post.astrologerId) || '',
    commentCount: Array.isArray(post.comments) ? post.comments.length : 0,
    mediaCount: Array.isArray(post.media) ? post.media.length : 0,
  }))
}

export function sortContentByDateDesc(content) {
  return (Array.isArray(content) ? content : []).slice().sort((a, b) => sortByDateDesc(a, b, (item) => item.createdAt))
}

// Posts have a visibility setting but no draft/published lifecycle, so no status
// is derived. `visibility` is the real state the record carries.
export function getContentVisibility(post) {
  return String(post?.visibility || '').trim()
}

export function selectContentVisibilityFilters(content) {
  const values = new Set()
  for (const item of Array.isArray(content) ? content : []) {
    const visibility = getContentVisibility(item)
    if (visibility) values.add(visibility)
  }
  return ['All', ...Array.from(values).sort((a, b) => a.localeCompare(b))]
}

export function matchesContentQuery(item, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  const fields = [item.id, item.title, item.body, item.astrologerName]
  return fields.some((field) => String(field || '').toLowerCase().includes(search))
}

export function filterAdminContent(content, { query = '', visibility = 'All' } = {}) {
  return (Array.isArray(content) ? content : []).filter((item) => {
    if (!matchesContentQuery(item, query)) return false
    if (visibility && visibility !== 'All' && getContentVisibility(item) !== visibility) return false
    return true
  })
}

export function findAdminContent(content, contentId) {
  return (Array.isArray(content) ? content : []).find((item) => item.id === contentId) || null
}
