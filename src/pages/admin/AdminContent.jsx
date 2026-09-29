import { useMemo, useState } from 'react'
import { Eye, FileText, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  filterAdminContent,
  getContentVisibility,
  selectAdminContent,
  selectContentVisibilityFilters,
  sortContentByDateDesc,
} from '../../utils/adminContent.js'

// Admin -> Content Management list.
//
// Reads the existing posts store from AppDataContext. Read-only: there is no
// edit, delete or publish action here.
export default function AdminContent() {
  const { astrologerPosts } = useAppData()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [visibility, setVisibility] = useState('All')

  const content = useMemo(() => sortContentByDateDesc(selectAdminContent(astrologerPosts)), [astrologerPosts])
  const visibilityFilters = useMemo(() => selectContentVisibilityFilters(content), [content])
  const visibleContent = useMemo(
    () => filterAdminContent(content, { query, visibility }),
    [content, query, visibility],
  )

  const openContent = (contentId) => navigate(`${routes.base}/content/${contentId}`)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Content Management"
        subtitle="Every piece of content published on this platform. Open an item to review it."
      />

      <Section className="!mt-4">
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by title, content, author, or ID"
                  className="text-input search-bar__input"
                  aria-label="Search content"
                />
                <button type="button" className="icon-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="search-filter-row__group">
              <label className="search-filter-row__heading muted" htmlFor="admin-content-visibility" style={{ fontSize: 13, fontWeight: 600 }}>
                Visibility
              </label>
              <select
                id="admin-content-visibility"
                className="select-input"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
              >
                {visibilityFilters.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Content"
        icon={FileText}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleContent.length})</span>}
      >
        <div className="table-wrap">
          {!content.length ? (
            <p className="muted">No content found.</p>
          ) : visibleContent.length === 0 ? (
            <p className="muted">No content match your search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Author</th>
                  <th>Visibility</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleContent.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title || '—'}</strong>
                      {item.id && <div className="muted" style={{ fontSize: 12 }}>{item.id}</div>}
                    </td>
                    <td>{item.type}</td>
                    <td>{item.astrologerName || item.astrologerId || '—'}</td>
                    <td>{getContentVisibility(item) || <span className="muted">Not available</span>}</td>
                    <td>{formatDisplayDate(item.createdAt)}</td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openContent(item.id)}>
                        <Eye size={15} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>

      <Section className="!mt-5">
        <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
          Posts are the only managed content type in this application. There is no banner, article,
          announcement or FAQ store, so none are listed here. Content carries a visibility setting but
          no draft or published state, so no status is shown.
        </p>
      </Section>
    </div>
  )
}
