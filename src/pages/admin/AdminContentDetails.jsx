import { useMemo } from 'react'
import { FileText } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import { findAdminContent, getContentVisibility, selectAdminContent } from '../../utils/adminContent.js'

// Admin -> Content details.
//
// Read-only. Creating, editing, deleting and publishing content all happen in
// their own flows; none of that behaviour is touched here.
function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || 'Not available'}</div>
    </div>
  )
}

export default function AdminContentDetails() {
  const { contentId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { astrologerPosts } = useAppData()

  const content = useMemo(() => selectAdminContent(astrologerPosts), [astrologerPosts])
  const item = useMemo(() => findAdminContent(content, contentId), [content, contentId])

  if (!item) {
    return <Navigate to={`${routes.base}/content`} replace />
  }

  const media = Array.isArray(item.media) ? item.media : []
  const comments = Array.isArray(item.comments) ? item.comments : []

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={item.title || 'Content'}
        subtitle={`${item.type} · ${item.astrologerName || item.astrologerId || 'Not available'}`}
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`${routes.base}/content`)}
          >
            Back to Content
          </button>
        }
      />

      <Section title="Content" icon={FileText} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="Content ID" value={item.id} />
            <DetailField label="Type" value={item.type} />
            <DetailField label="Author" value={item.astrologerName || item.astrologerId} />
            <DetailField label="Visibility" value={getContentVisibility(item)} />
            <DetailField label="Created" value={formatDisplayDate(item.createdAt)} />
            <DetailField label="Updated" value={formatDisplayDate(item.updatedAt)} />
            <DetailField label="Likes" value={item.likeCount != null ? String(item.likeCount) : null} />
            <DetailField
              label="Comments"
              value={item.commentsEnabled === undefined ? null : item.commentsEnabled ? 'Enabled' : 'Disabled'}
            />
            <DetailField label="Media files" value={media.length ? String(media.length) : null} />
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Body</div>
            <div style={{ marginTop: 4 }}>{item.body || 'Not available'}</div>
          </div>
        </Card>
      </Section>

      <Section title="Comments" icon={FileText} className="!mt-5">
        <Card>
          {comments.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No records found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Author</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map((comment) => (
                    <tr key={comment.id}>
                      <td>{comment.author || 'Not available'}</td>
                      <td>{comment.text || 'Not available'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>
    </div>
  )
}
