import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { useEditor } from '../../state/EditorContext.jsx'
import { hasEditorPermission } from '../../utils/editorAccess.js'
import './editor-content.css'

export default function EditorContent() {
  const { currentUser } = useAuth(); const { astrologerPosts = [], actions } = useAppData(); const { currentEditor, recordAudit } = useEditor(); const editor = currentEditor || currentUser; const [draft, setDraft] = useState({ title: '', body: '' })
  const canCreate = hasEditorPermission(editor, 'Content', 'Create'); const canEdit = hasEditorPermission(editor, 'Content', 'Edit'); const canDelete = hasEditorPermission(editor, 'Content', 'Delete')
  const posts = astrologerPosts.filter((post) => !currentUser?.astrologerId || !post.astrologerId || post.astrologerId === currentUser.astrologerId)
  const create = () => { if (!draft.title.trim()) return; const post = actions.createPost({ astrologerId: currentUser.astrologerId, title: draft.title.trim(), body: draft.body.trim(), visibility: 'public' }); recordAudit('Content Created', 'Content', `Created ${post.title || draft.title}.`); setDraft({ title: '', body: '' }) }
  const edit = (post) => { const title = window.prompt('Update content title', post.title || ''); if (!title?.trim()) return; actions.updatePost(post.id, { title: title.trim() }); recordAudit('Content Edited', 'Content', `Edited ${post.title || post.id}.`) }
  const remove = (post) => { if (!window.confirm(`Delete ${post.title || 'this content'}?`)) return; actions.deletePost(post.id); recordAudit('Content Deleted', 'Content', `Deleted ${post.title || post.id}.`) }
  return <section className="editor-page"><div className="editor-page-intro"><span className="editor-eyebrow">CONTENT</span><h2>Content workspace</h2><p>Create and manage content using the permissions assigned by the astrologer.</p></div>{canCreate && <div className="editor-panel editor-content-composer"><h3>Create content</h3><div className="editor-content-form"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Content title" /><textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Write content..." rows="3" /><button type="button" className="editor-action-button" disabled={!draft.title.trim()} onClick={create}><Plus size={15} /> Create</button></div></div>}<div className="editor-panel editor-list">{posts.slice(0, 12).map((post, index) => <article className="editor-work-item" key={post.id || index}><div className="editor-work-item-main"><strong>{post.title || post.caption || 'Untitled post'}</strong><small>{post.status || 'Draft content'}</small><p>{post.body || post.content || ''}</p></div><div className="editor-work-item-actions"><span className="editor-badge">Content</span>{canEdit && <button type="button" className="editor-action-link" onClick={() => edit(post)}>Edit</button>}{canDelete && <button type="button" className="editor-action-danger" onClick={() => remove(post)}>Delete</button>}</div></article>)}{!posts.length && <p className="editor-empty">No content is available in this workspace yet.</p>}</div></section>
}
