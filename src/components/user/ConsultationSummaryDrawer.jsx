import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CircleAlert, Eye, FileText, Image as ImageIcon, Paperclip, Upload, WalletCards, X } from 'lucide-react'
import { consultationAstrologers } from '../../data/consultationAstrologers.js'
import { APPOINTMENT_CONFIG, parseKey } from '../../pages/user/appointments/bookingAstrologerData.js'

function shortDayDate(value) {
  const date = parseKey(value)
  return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`
}

function initials(name = '') {
  return String(name).split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function isImageAttachment(attachment) {
  const type = attachment?.type || ''
  const url = attachment?.dataUrl || attachment?.url || ''
  return type.startsWith('image/') || url.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment?.name || '')
}

function attachmentFor(astrologer, consultationProfile) {
  // Attachments are owned by the selected profile. Keep this permissive so the
  // component also works with API records using either field name.
  return astrologer?.horoscopeAttachment || astrologer?.horoscope || consultationProfile?.horoscopeAttachment || consultationProfile?.horoscope || null
}

const CONSULTATION_PURPOSES = ['Child', 'Marriage', 'Education', 'Others']

function fullUserName(user) {
  const combined = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  return combined || user?.fullName || user?.name || 'User'
}

export default function ConsultationSummaryDrawer({ astrologer, slot, walletBalance, user, onClose, onProceed }) {
  const [preview, setPreview] = useState(null)
  const [uploadedHoroscope, setUploadedHoroscope] = useState(null)
  const [consultationFor, setConsultationFor] = useState('')
  const [otherPurpose, setOtherPurpose] = useState('')
  const [concern, setConcern] = useState('')
  const [userName, setUserName] = useState(() => fullUserName(user) === 'User' ? '' : fullUserName(user))
  const [birthDate, setBirthDate] = useState(() => user?.dateOfBirth || user?.dob || user?.profile?.dateOfBirth || user?.horoscope?.dateOfBirth || '')
  const [validationError, setValidationError] = useState('')
  const horoscopeInputRef = useRef(null)
  const amount = Number(slot?.price || 0)
  const balance = Number(walletBalance || 0)
  const sufficient = balance >= amount
  const mode = slot.type || APPOINTMENT_CONFIG.mode
  const consultationProfile = consultationAstrologers.find((item) => item.id === astrologer.id)
  const profileImage = astrologer.profileImage || consultationProfile?.profileImage || ''
  const horoscopeAttachment = uploadedHoroscope || attachmentFor(astrologer, consultationProfile)
  const attachmentUrl = horoscopeAttachment?.dataUrl || horoscopeAttachment?.url || ''
  const attachmentIsImage = isImageAttachment(horoscopeAttachment)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  const appointmentRows = [
    ['Astrologer', astrologer.name],
    ['Date', shortDayDate(slot.date)],
    ['Time', `${slot.timeLabel} – ${slot.endLabel}`],
    ['Duration', slot.duration],
    ['Type', mode],
  ]
  const submitSummary = () => {
    if (!consultationFor) return setValidationError('Select what this consultation is for.')
    if (consultationFor === 'Others' && !otherPurpose.trim()) return setValidationError('Please specify the consultation purpose.')
    if (!userName.trim()) return setValidationError('Enter your full name.')
    if (!birthDate) return setValidationError('Enter your date of birth.')
    if (!concern.trim()) return setValidationError('Describe your concern before proceeding.')
    setValidationError('')
    onProceed({ userName: userName.trim(), consultationFor, otherPurpose: otherPurpose.trim(), question: concern.trim(), dob: birthDate })
  }

  return createPortal(
    <div className="consultation-drawer-overlay" onClick={onClose}>
      <aside className="consultation-drawer" role="dialog" aria-modal="true" aria-label="Consultation summary" onClick={(event) => event.stopPropagation()}>
        <header className="consultation-drawer__head">
          <strong>Consultation summary</strong>
          <button type="button" className="icon-btn" aria-label="Close consultation summary" onClick={onClose}><X size={16} /></button>
        </header>

        <div className="consultation-drawer__body">
          <div className="consultation-astrologer">
            {profileImage
              ? <button type="button" className="consultation-astrologer__photo-button" onClick={() => setPreview({ type: 'profile', url: profileImage, name: astrologer.name })} aria-label={`View ${astrologer.name}'s profile photo`}><img className="consultation-astrologer__photo" src={profileImage} alt={`${astrologer.name} profile`} /><span className="consultation-astrologer__photo-indicator"><Eye size={12} aria-hidden="true" /></span></button>
              : <span className="consultation-astrologer__photo is-fallback" aria-hidden="true">{initials(astrologer.name)}</span>}
            <div className="consultation-astrologer__copy">
              <strong>{astrologer.name}</strong>
              <span>{astrologer.specialization} · {mode}</span>
            </div>
          </div>

          <div className="consultation-section-heading">Horoscope Details</div>
          <div className="consultation-summary-card consultation-summary-card--compact consultation-user-horoscope">
            <div className="consultation-horoscope-form">
              <label><span>User Name</span><input className="text-input" value={userName} onChange={(event) => { setUserName(event.target.value); setValidationError('') }} placeholder="Enter your full name" /></label>
              <label><span>Date of Birth</span><input className="text-input" type="date" value={birthDate} onChange={(event) => { setBirthDate(event.target.value); setValidationError('') }} /></label>
              <label><span>Consultation For</span><select className="select-input" value={consultationFor} onChange={(event) => { setConsultationFor(event.target.value); setValidationError('') }}><option value="">Select purpose</option>{CONSULTATION_PURPOSES.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}</select></label>
              {consultationFor === 'Others' && <label><span>Please specify</span><input className="text-input" value={otherPurpose} onChange={(event) => { setOtherPurpose(event.target.value); setValidationError('') }} placeholder="Please specify" /></label>}
              <label><span>Describe your concern</span><textarea className="text-input consultation-concern" rows="3" value={concern} onChange={(event) => { setConcern(event.target.value); setValidationError('') }} placeholder="Type your question or describe what you would like to discuss with the astrologer…" /></label>
              {validationError && <p className="consultation-horoscope-error" role="alert">{validationError}</p>}
            </div>
          </div>

          <div className="consultation-section-heading">Horoscope Attachment</div>
          {horoscopeAttachment ? (
            <button type="button" className="consultation-attachment" onClick={() => setPreview({ type: 'horoscope', attachment: horoscopeAttachment })}>
              <span className={`consultation-attachment__visual${attachmentIsImage && attachmentUrl ? ' is-image' : ''}`}>
                {attachmentIsImage && attachmentUrl ? <img src={attachmentUrl} alt="" /> : <FileText size={22} aria-hidden="true" />}
              </span>
              <span className="consultation-attachment__copy">
                <span className="consultation-attachment__label">Horoscope Details</span>
                <strong title={horoscopeAttachment.name}>{horoscopeAttachment.name || 'Horoscope attachment'}</strong>
                {horoscopeAttachment.size && <small>{horoscopeAttachment.size}</small>}
              </span>
              <span className="consultation-attachment__view">View Attachment <ArrowRight size={14} aria-hidden="true" /></span>
            </button>
          ) : (
            <button type="button" className="consultation-upload" onClick={() => horoscopeInputRef.current?.click()}>
              <span className="consultation-upload__icon"><Upload size={18} aria-hidden="true" /></span>
              <span><strong>Upload horoscope</strong><small>PDF, JPG or PNG · up to 5 MB</small></span>
              <Paperclip size={16} aria-hidden="true" />
            </button>
          )}
          <input
            ref={horoscopeInputRef}
            className="consultation-upload__input"
            type="file"
            accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file || file.size > 5 * 1024 * 1024) return
              const reader = new FileReader()
              reader.onload = () => setUploadedHoroscope({ name: file.name, type: file.type || 'application/octet-stream', size: `${Math.ceil(file.size / 1024)} KB`, dataUrl: reader.result })
              reader.readAsDataURL(file)
              event.target.value = ''
            }}
          />

          <div className="consultation-section-heading">Appointment Details</div>
          <div className="consultation-summary-card">
            {appointmentRows.map(([label, value]) => (
              <div className="consultation-summary-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            <div className="consultation-summary-row consultation-summary-row--amount">
              <span>Amount</span>
              <strong>₹{amount.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className={`consultation-wallet-card${sufficient ? '' : ' is-insufficient'}`}>
            <div className="consultation-wallet-card__row">
              <WalletCards size={17} aria-hidden="true" />
              <span>Wallet Balance</span>
              <strong>₹{balance.toLocaleString('en-IN')}</strong>
            </div>
            {!sufficient && <p className="consultation-wallet-message" role="status"><CircleAlert size={14} aria-hidden="true" /> Insufficient wallet balance — booking is blocked until you add funds.</p>}
          </div>
        </div>

        <footer className="consultation-drawer__foot">
          <button type="button" className="btn btn-primary" disabled={!sufficient} onClick={submitSummary}>
            Proceed to Payment <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
        </footer>
      </aside>
      {preview && <AttachmentPreview preview={preview} onClose={() => setPreview(null)} />}
    </div>,
    document.body,
  )
}

function AttachmentPreview({ preview, onClose }) {
  const isProfile = preview.type === 'profile'
  const attachment = preview.attachment
  const url = isProfile ? preview.url : attachment?.dataUrl || attachment?.url || ''
  const isImage = isProfile || isImageAttachment(attachment)

  return (
    <div className="consultation-preview-overlay" role="presentation" onClick={(event) => { event.stopPropagation(); onClose() }}>
      <section className="consultation-preview" role="dialog" aria-modal="true" aria-labelledby="consultation-preview-title" onClick={(event) => event.stopPropagation()}>
        <header className="consultation-preview__head">
          <div>
            <strong id="consultation-preview-title">{isProfile ? 'Astrologer photo' : 'Horoscope attachment'}</strong>
            {!isProfile && <span>{attachment?.name || 'Horoscope attachment'}</span>}
          </div>
          <button type="button" className="icon-btn" aria-label="Close preview" onClick={onClose}><X size={17} /></button>
        </header>
        <div className="consultation-preview__body">
          {url && isImage && <img src={url} alt={isProfile ? `${preview.name} profile` : 'Horoscope attachment'} />}
          {url && !isImage && <iframe title={attachment?.name || 'Horoscope attachment'} src={url} />}
          {!url && <div className="consultation-preview__unavailable"><ImageIcon size={32} aria-hidden="true" /><strong>Preview unavailable</strong><span>This attachment does not have a viewable file URL.</span></div>}
        </div>
      </section>
    </div>
  )
}
