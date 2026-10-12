import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { RadioGroup } from '../OptionGroup.jsx'
import UploadField from '../UploadField.jsx'
import { disputeReasons, platformDisputeReasons } from '../../data/mockData.js'
import { mockAstrologers } from '../../data/notificationData.js'
import { useAppData } from '../../state/AppDataContext.jsx'
import Card from '../ui/Card.jsx'
import StatusBadge from '../StatusBadge.jsx'

function getWordPreview(content) {
  const text = String(content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 4) return { preview: text, isTruncated: false }

  return {
    preview: words.slice(0, 4).join(' '),
    isTruncated: true,
  }
}

function ContentPreview({ content, title, onViewFull, quoted = false, className = 'muted' }) {
  const { preview, isTruncated } = getWordPreview(content)

  return (
    <div className={className}>
      {quoted ? `“${preview}”` : preview}
      {isTruncated && <button type="button" className="link-btn ml-1" aria-label={`See full ${title.toLowerCase()}`} onClick={() => onViewFull({ title, content })}>See more…</button>}
    </div>
  )
}

function purchaseLabel(question) {
  const type = question.purchaseType || '—'
  const amount = Number(question.purchaseAmount) || 0
  return amount > 0 ? `${type} · ₹${amount.toLocaleString('en-IN')}` : type
}

// Shared user-side dispute form. It owns the whole modal so the My Questions and
// Disputes screens can raise a dispute inline on the same page, and the
// standalone Raise Dispute page can reuse the exact same form.
export default function RaiseDisputeModal({ question, onClose, onSubmitted }) {
  const { actions } = useAppData()
  const alreadyRaised = Boolean(question?.dispute)
  const [target, setTarget] = useState(question?.dispute?.target || '')
  const [reason, setReason] = useState(question?.dispute?.reason || '')
  const [description, setDescription] = useState(question?.dispute?.description || '')
  const [attachmentName, setAttachmentName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fullContent, setFullContent] = useState(null)

  const reasonOptions = target === 'AstroConnect Platform' ? platformDisputeReasons : target === 'Astrologer' ? disputeReasons : []

  const close = useCallback(() => {
    onClose?.()
  }, [onClose])

  // Reset the form whenever a different question is loaded into the modal.
  useEffect(() => {
    setTarget(question?.dispute?.target || '')
    setReason(question?.dispute?.reason || '')
    setDescription(question?.dispute?.description || '')
    setAttachmentName('')
    setSubmitting(false)
    setFullContent(null)
  }, [question?.id, question?.dispute?.target, question?.dispute?.reason, question?.dispute?.description])

  useEffect(() => {
    if (!question) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (fullContent) {
        setFullContent(null)
        return
      }
      close()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [close, fullContent, question])

  if (!question) return null

  const astrologerName = mockAstrologers.find((item) => item.id === question.astrologerId)?.name || question.user || 'Astrologer'

  const handleSubmit = () => {
    if (alreadyRaised || submitting) return
    if (!target || !reason || !description.trim()) return
    setSubmitting(true)
    actions.raiseDispute(question.id, {
      target,
      reason,
      description,
      ...(attachmentName ? { attachment: attachmentName } : {}),
    })
    onSubmitted?.()
    close()
  }

  return (
    <>
      {createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={close}>
          <div
            className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll"
            style={{ width: 'min(820px, calc(100vw - 32px))' }}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div style={{ minWidth: 0 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>{alreadyRaised ? 'Dispute Details' : 'Raise Dispute'}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {question.campaignName || 'User question'} · {question.id}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <StatusBadge label={question.status} />
                <button type="button" className="icon-btn" aria-label="Close dispute popup" onClick={close}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="modal-card__content user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Question Details</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                    gap: 14,
                    background: 'var(--violet-50)',
                    borderRadius: 'var(--radius-s)',
                    padding: 14,
                    fontSize: 14,
                  }}
                >
                  <div><strong>Question ID</strong><div className="muted">{question.id}</div></div>
                  <div><strong>Campaign</strong><div className="muted">{question.campaignName || 'No campaign'}</div></div>
                  <div><strong>Category</strong><div className="muted">{question.category}</div></div>
                  <div><strong>Question Type</strong><div className="muted">{question.type}</div></div>
                  <div><strong>Question For</strong><div className="muted">{question.questionFor || '—'}</div></div>
                  <div><strong>Language</strong><div className="muted">{question.language || '—'}</div></div>
                  <div><strong>Astrologer</strong><div className="muted">{astrologerName}</div></div>
                  <div><strong>Purchase</strong><div className="muted">{purchaseLabel(question)}</div></div>
                </div>
              </div>

              <div>
                <div className="field-label-top" style={{ marginBottom: 8 }}>Your Question</div>
                <div style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14 }}>
                  <ContentPreview content={question.question} title="Your Question" quoted className="text-[color:var(--ink)]" onViewFull={setFullContent} />
                </div>
              </div>

              <div>
                <div className="field-label-top" style={{ marginBottom: 8 }}>Astrologer's Answer</div>
                <div style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14 }}>
                  <ContentPreview content={question.answer || 'No answer available.'} title="Astrologer's Answer" quoted className="text-[color:var(--ink)]" onViewFull={setFullContent} />
                </div>
              </div>

              {alreadyRaised ? (
                <Card>
                  <div className="section-title" style={{ fontSize: 15 }}>Existing Dispute</div>
                  <div className="grid gap-3">
                    <div><strong>Target</strong><div className="muted">{question.dispute.target || '—'}</div></div>
                    <div><strong>Reason</strong><ContentPreview content={question.dispute.reason} title="Dispute Reason" onViewFull={setFullContent} /></div>
                    {question.dispute.description ? <div><strong>Description</strong><ContentPreview content={question.dispute.description} title="Dispute Description" onViewFull={setFullContent} /></div> : null}
                    <div><strong>Attachment</strong><div className="muted">{question.dispute.attachment || '—'}</div></div>
                    <div><strong>Status</strong><StatusBadge label={question.dispute.status || 'Open'} /></div>
                  </div>
                </Card>
              ) : (
                <>
                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Raise Dispute To</div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Choose who should review this dispute. This decides where it is routed.</div>
                    <RadioGroup
                      name={`dispute-target-${question.id}`}
                      options={['Astrologer', 'AstroConnect Platform']}
                      value={target}
                      onChange={(value) => {
                        setTarget(value)
                        setReason('')
                      }}
                    />
                  </Card>

                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Dispute Reason</div>
                    <select value={reason} onChange={(event) => setReason(event.target.value)} className="select-input" disabled={!target}>
                      <option value="">{target ? 'Select Reason' : 'Select a recipient first'}</option>
                      {reasonOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </Card>

                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Dispute Description</div>
                    <textarea className="textarea-box" placeholder="Explain your issue in detail..." maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
                    <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>Characters: {description.length} / 1000</div>
                  </Card>

                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Attachments (Optional)</div>
                    <UploadField
                      label="Upload screenshot, image, or PDF"
                      accept=".pdf,.jpg,.jpeg,.png"
                      hint="Only the selected file name is recorded for your dispute."
                      fileName={attachmentName}
                      onFileSelect={(file) => setAttachmentName(file?.name || '')}
                    />
                  </Card>
                </>
              )}
            </div>

            <div className="modal-card__footer user-modal-card__footer">
              {alreadyRaised ? (
                <button type="button" className="btn btn-primary" onClick={close}>Close</button>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!target || !reason || !description.trim() || submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? 'Submitting…' : 'Submit Dispute'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {fullContent && createPortal(
        <div className="modal-overlay user-modal-overlay" style={{ zIndex: 10000 }} onClick={() => setFullContent(null)}>
          <div className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll" style={{ width: 'min(640px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>{fullContent.title}</div>
              <button type="button" className="icon-btn" aria-label="Close full content" onClick={() => setFullContent(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14, whiteSpace: 'pre-wrap' }}>{fullContent.content}</div>
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              <button type="button" className="btn btn-primary" onClick={() => setFullContent(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
