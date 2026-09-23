import { useState } from 'react'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { useEditor } from '../../state/EditorContext.jsx'
import { hasEditorPermission } from '../../utils/editorAccess.js'
import './editor-questions.css'

export default function EditorQuestions() {
  const { currentUser } = useAuth(); const { activeQuestions = [], actions } = useAppData(); const { currentEditor, recordAudit } = useEditor(); const editor = currentEditor || currentUser; const [drafts, setDrafts] = useState({})
  const canRespond = hasEditorPermission(editor, 'Questions', 'Respond'); const canManage = hasEditorPermission(editor, 'Questions', 'Manage')
  const questions = activeQuestions.filter((question) => !currentUser?.astrologerId || !question.astrologerId || question.astrologerId === currentUser.astrologerId)
  const submitAnswer = (question) => { const answer = drafts[question.id]?.trim(); if (!answer) return; actions.submitQuestionAnswer(question.id, answer); recordAudit('Question Responded', 'Questions', `Responded to ${question.id}.`); setDrafts((items) => ({ ...items, [question.id]: '' })) }
  return <section className="editor-page"><div className="editor-page-intro"><span className="editor-eyebrow">QUESTIONS</span><h2>Question queue</h2><p>Review and respond to questions assigned to the astrologer workspace.</p></div><div className="editor-panel editor-list">{questions.slice(0, 12).map((question) => <article className="editor-work-item" key={question.id}><div className="editor-work-item-main"><strong>{question.subject || question.title || question.category || 'Astrology question'}</strong><small>{question.status || 'Open'} · {question.userName || question.user || 'Client'} · {question.id}</small>{canRespond && <textarea value={drafts[question.id] || ''} onChange={(event) => setDrafts((items) => ({ ...items, [question.id]: event.target.value }))} placeholder="Write a response..." rows="2" />}</div><div className="editor-work-item-actions"><span className="editor-badge">{question.status || 'Open'}</span>{canRespond && <button type="button" className="editor-action-button" disabled={!drafts[question.id]?.trim()} onClick={() => submitAnswer(question)}>Respond</button>}{canManage && <button type="button" className="editor-action-link" onClick={() => { actions.updateQuestionStatus(question.id, 'In Progress'); recordAudit('Question Managed', 'Questions', `Updated ${question.id}.`) }}>Mark in progress</button>}</div></article>)}{!questions.length && <p className="editor-empty">No active questions right now.</p>}</div></section>
}
