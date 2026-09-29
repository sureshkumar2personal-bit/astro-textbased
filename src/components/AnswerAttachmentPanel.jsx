import { useRef, useState } from 'react'
import { Download, ExternalLink, FileText, Image as ImageIcon, Link2, Trash2, UploadCloud, X } from 'lucide-react'
import { formatFileSize, validateAttachmentFile, validateReferenceLink } from '../utils/answer.js'
import { useToast } from './Toast.jsx'

function makeId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function AttachmentRow({ attachment, readOnly, onRemove }) {
  const isImage = attachment.kind === 'image'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 12,
        border: '1px solid var(--surface-border)',
        background: 'var(--surface-strong, #fff)',
      }}
    >
      {isImage ? (
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', background: 'var(--neutral-bg)', flex: 'none' }}
        />
      ) : (
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'var(--primary-bg)',
            color: 'var(--primary)',
            flex: 'none',
          }}
        >
          <FileText size={18} />
        </span>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {attachment.name || 'Attachment'}
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>
          {formatFileSize(attachment.size)} · {isImage ? 'Image' : 'PDF'}
        </div>
      </div>

      {readOnly ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 'none' }}>
          {isImage ? (
            <a className="btn btn-ghost btn-sm" style={{ padding: '5px 9px' }} href={attachment.dataUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={13} /> <span>View</span>
            </a>
          ) : (
            <>
              <a className="btn btn-ghost btn-sm" style={{ padding: '5px 9px' }} href={attachment.dataUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={13} /> <span>View</span>
              </a>
              <a className="btn btn-ghost btn-sm" style={{ padding: '5px 9px' }} href={attachment.dataUrl} download={attachment.name}>
                <Download size={13} /> <span>Download</span>
              </a>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="icon-btn"
          aria-label={`Remove ${attachment.name || 'attachment'}`}
          onClick={() => onRemove(attachment.id)}
          style={{ width: 30, height: 30, minWidth: 30, color: 'var(--muted)' }}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

function LinkRow({ link, readOnly, onRemove }) {
  const display = link.title || link.url
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 12,
        border: '1px solid var(--surface-border)',
        background: 'var(--surface-strong, #fff)',
      }}
    >
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 40,
          height: 40,
          borderRadius: 8,
          background: 'var(--sky-bg)',
          color: 'var(--sky-600)',
          flex: 'none',
        }}
      >
        <Link2 size={17} />
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {display}
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {link.url}
        </div>
      </div>

      {readOnly ? (
        <a className="btn btn-ghost btn-sm" style={{ padding: '5px 9px', flex: 'none' }} href={link.url} target="_blank" rel="noreferrer">
          <ExternalLink size={13} /> <span>Open</span>
        </a>
      ) : (
        <>
          <a className="btn btn-ghost btn-sm" style={{ padding: '5px 9px', flex: 'none' }} href={link.url} target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> <span>Open</span>
          </a>
          <button
            type="button"
            className="icon-btn"
            aria-label="Remove reference link"
            onClick={() => onRemove(link.id)}
            style={{ width: 30, height: 30, minWidth: 30, color: 'var(--muted)' }}
          >
            <Trash2 size={15} />
          </button>
        </>
      )}
    </div>
  )
}

export default function AnswerAttachmentPanel({ attachments = [], links = [], onChange, readOnly = false }) {
  const { toast } = useToast()
  const pdfInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const [linkFormOpen, setLinkFormOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')

  const emit = (nextAttachments, nextLinks) => {
    onChange?.({ attachments: nextAttachments, links: nextLinks })
  }

  const handleAddFile = (kind) => (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = validateAttachmentFile(file, kind)
    if (!result.ok) {
      toast(result.error, { kind: 'error' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      emit([...attachments, { id: makeId(kind), kind, name: file.name, size: file.size, type: file.type, dataUrl: reader.result }], links)
    }
    reader.readAsDataURL(file)
  }

  const removeAttachment = (id) => {
    emit(attachments.filter((item) => item.id !== id), links)
  }

  const removeLink = (id) => {
    emit(attachments, links.filter((item) => item.id !== id))
  }

  const addLink = () => {
    const result = validateReferenceLink(url)
    if (!result.ok) {
      toast(result.error, { kind: 'error' })
      return
    }
    emit(attachments, [...links, { id: makeId('link'), url: result.url, title: title.trim() }])
    setUrl('')
    setTitle('')
    setLinkFormOpen(false)
  }

  const closeLinkForm = () => {
    setLinkFormOpen(false)
    setUrl('')
    setTitle('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!readOnly && (
        <>
          <div className="flex flex-wrap gap-2" style={{ alignItems: 'center' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => pdfInputRef.current?.click()}>
              <UploadCloud size={14} /> <span>Upload PDF</span>
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => imageInputRef.current?.click()}>
              <ImageIcon size={14} /> <span>Upload Image</span>
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setLinkFormOpen((open) => !open)}>
              <Link2 size={14} /> <span>Add Reference Link</span>
            </button>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple={false}
              style={{ display: 'none' }}
              onChange={handleAddFile('pdf')}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={false}
              style={{ display: 'none' }}
              onChange={handleAddFile('image')}
            />
          </div>

          {linkFormOpen && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
                padding: 12,
                borderRadius: 14,
                border: '1px solid var(--surface-border)',
                background: 'var(--neutral-bg)',
              }}
            >
              <input
                className="text-input"
                style={{ flex: '1 1 240px', minWidth: 180 }}
                placeholder="https://youtube.com/..."
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
              <input
                className="text-input"
                style={{ flex: '1 1 160px', minWidth: 140 }}
                placeholder="Link title (optional)"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={addLink}>
                Add Link
              </button>
              <button type="button" className="icon-btn" aria-label="Cancel link form" onClick={closeLinkForm} style={{ width: 30, height: 30, minWidth: 30 }}>
                <X size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {attachments.length === 0 && links.length === 0 ? (
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          {readOnly
            ? 'No attachments or reference links were shared with this answer.'
            : 'No attachments yet. Add a remedy / Parikaram PDF, a supporting image, or a guidance link to strengthen your answer.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attachments.map((attachment) => (
            <AttachmentRow key={attachment.id} attachment={attachment} readOnly={readOnly} onRemove={removeAttachment} />
          ))}
          {links.map((link) => (
            <LinkRow key={link.id} link={link} readOnly={readOnly} onRemove={removeLink} />
          ))}
        </div>
      )}
    </div>
  )
}