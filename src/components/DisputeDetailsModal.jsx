import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { TempleLampIcon, TempleScrollIcon, TempleShieldIcon } from './TempleIcons.jsx'

function getWordPreview(content) {
  const text = String(content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 4) return { preview: text, isTruncated: false }

  return {
    preview: words.slice(0, 4).join(' '),
    isTruncated: true,
  }
}

function ContentPreview({ content, title, onViewFull, quoted = false, className = 'astrologer-modal-question' }) {
  const { preview, isTruncated } = getWordPreview(content)

  return (
    <div className={className}>
      {quoted ? `“${preview}”` : preview}
      {isTruncated && (
        <button type="button" className="link-btn ml-1" aria-label={`See full ${title.toLowerCase()}`} onClick={() => onViewFull({ title, content })}>
          See more…
        </button>
      )}
    </div>
  )
}

export default function DisputeDetailsModal({ question, onClose, onResponded }) {
  const { actions } = useAppData()
  const [response, setResponse] = useState(question?.dispute?.response || '')
  const [status, setStatus] = useState(question?.dispute?.status || 'Open')
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [fullContent, setFullContent] = useState(null)

  useEffect(() => {
    setResponse(question?.dispute?.response || '')
    setStatus(question?.dispute?.status || 'Open')
  }, [question?.id, question?.dispute?.response, question?.dispute?.status])

  const questionId = question?.id

  useEffect(() => {
    if (!questionId) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (fullContent) {
        setFullContent(null)
        return
      }
      if (attachmentOpen) {
        setAttachmentOpen(false)
        return
      }
      onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [questionId, fullContent, attachmentOpen, onClose])

  if (!question?.dispute) return null

  const isSubmitted = status !== 'Open'

  const updateResponse = (nextStatus) => {
    if (!question) return
    setStatus(nextStatus)
    actions.respondToDispute(question.id, response, nextStatus)
    if (onResponded) onResponded()
  }

  return (
    <>
      {createPortal(
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(820px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div className="astrologer-modal-title">Dispute Details</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {question.campaignName} · DSP-{question.id}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
                <StatusBadge label={status} />
                <button type="button" className="icon-btn" aria-label="Close dispute details" onClick={onClose} style={{ width: 32, height: 32, minWidth: 32 }}><X size={16} /></button>
              </div>
            </div>

            <div className="modal-card__content astrologer-modal-content">
              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleShieldIcon size={14} />User Details</div>
                <div className="astrologer-modal-highlight astrologer-modal-details-grid">
                  <div><strong>Name</strong><div className="muted">{question.user}</div></div>
                  <div><strong>Question ID</strong><div className="muted">{question.id}</div></div>
                  <div><strong>Question Type</strong><div className="muted">{question.type}</div></div>
                  <div><strong>Category</strong><div className="muted">{question.category}</div></div>
                  <div><strong>Raised On</strong><div className="muted">{question.raised}</div></div>
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleScrollIcon size={14} />Original Question</div>
                <div className="astrologer-modal-highlight">
                  <ContentPreview content={question.question} title="Original Question" quoted onViewFull={setFullContent} />
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLampIcon size={14} />Original Answer</div>
                <div className="astrologer-modal-highlight">
                  <ContentPreview content={question.answer || 'Answer is being reviewed.'} title="Original Answer" quoted onViewFull={setFullContent} />
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleShieldIcon size={14} />User Dispute Details</div>
                <div className="astrologer-modal-highlight" style={{ display: 'grid', gap: 12 }}>
                  <div><strong>Dispute Content</strong><ContentPreview content={[question.dispute.reason, question.dispute.description].filter(Boolean).join('. ')} title="User Dispute Details" className="muted mt-1" onViewFull={setFullContent} /></div>
                  {question.dispute.attachment && <button className="option-pill" style={{ width: 'fit-content' }} type="button" onClick={() => setAttachmentOpen(true)}><span className="option-mark"><TempleScrollIcon size={14} /></span>Open {question.dispute.attachment}</button>}
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLampIcon size={14} />Astrologer Response</div>
                {isSubmitted ? (
                  <div className="astrologer-modal-highlight">
                    <ContentPreview content={response || 'No response was provided.'} title="Astrologer Response" quoted onViewFull={setFullContent} />
                  </div>
                ) : <>
                  <textarea className="textarea-box" style={{ width: '100%' }} placeholder="Write your clarification or resolution here..." maxLength={3000} value={response} onChange={(event) => setResponse(event.target.value)} />
                  <div className="muted" style={{ fontSize: 12 }}>Characters: {response.length} / 3000</div>
                </>}
              </div>
            </div>

            <div className="modal-card__footer astrologer-modal-footer-actions">
              {isSubmitted && <span style={{ color: 'var(--green-600)', fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>Response submitted successfully</span>}
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              {!isSubmitted && <>
                <button className="btn btn-outline" onClick={() => updateResponse('Closed')}>Close Dispute</button>
                <button className="btn btn-primary" disabled={!response.trim()} onClick={() => updateResponse('Resolved')}>Submit Response</button>
              </>}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {fullContent && createPortal(
        <div className="modal-overlay" style={{ zIndex: 70 }} onClick={() => setFullContent(null)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(640px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="astrologer-modal-title">{fullContent.title}</div>
              <button type="button" className="icon-btn" aria-label="Close full content" onClick={() => setFullContent(null)} style={{ width: 32, height: 32, minWidth: 32 }}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="astrologer-modal-highlight astrologer-modal-question" style={{ whiteSpace: 'pre-wrap' }}>{fullContent.content}</div>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-primary" onClick={() => setFullContent(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {attachmentOpen && question.dispute && <div className="modal-overlay" onClick={() => setAttachmentOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="section-title">Attachment Preview</div><div className="muted" style={{ marginBottom: 16 }}>{question.dispute.attachment || 'Attachment.pdf'} is now open in the dispute viewer.</div><button className="btn btn-primary" onClick={() => setAttachmentOpen(false)}>Close</button></div></div>}
    </>
  )
}