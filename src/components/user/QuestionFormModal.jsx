import { createPortal } from 'react-dom'
import { X, CheckCircle2, FileText } from 'lucide-react'
import { RadioGroup } from '../OptionGroup.jsx'
import UploadField from '../UploadField.jsx'
import VoiceTextArea from '../VoiceTextArea.jsx'
import Card from '../ui/Card.jsx'
import { formatFileSize } from '../../utils/answer.js'
import {
  HOROSCOPE_MODE_NONE,
  HOROSCOPE_MODE_SAVED,
  HOROSCOPE_MODE_UPLOAD,
  getSavedHoroscopeLabel,
  getSavedHoroscopeSummary,
} from '../../utils/horoscope.js'
import { formatSlotAmount } from '../../utils/purchasedSlots.js'
import {
  getQuestionCreditDaysRemaining,
  getQuestionCreditOfferLabel,
} from '../../utils/questionCredits.js'

const RAISED_FOR = ['Myself', 'Others']
const LANGUAGES = ['Tamil', 'Tanglish', 'English']
const QUESTION_CHAR_LIMIT = 500
const SPEECH_LANG_BY_LANGUAGE = { Tamil: 'ta-IN', Tanglish: 'en-IN', English: 'en-IN' }

// Compact horoscope block shared by General and Personal questions.
//
// Optional by default: it only appears when the user asks for it, and the only
// thing it rejects is a choice that cannot be fulfilled (picking the saved
// horoscope with nothing saved, or picking upload without choosing a file).
function HoroscopeSection({ savedHoroscope, mode, uploadedFile, onSelectMode, onFileSelected, onRemoveFile, disabled = false }) {
  const hasSaved = Boolean(savedHoroscope?.exists)
  const isSaved = mode === HOROSCOPE_MODE_SAVED && hasSaved
  const isUpload = mode === HOROSCOPE_MODE_UPLOAD

  const options = [
    { value: HOROSCOPE_MODE_SAVED, label: 'Use Saved Horoscope', disabled: !hasSaved, hint: hasSaved ? getSavedHoroscopeLabel(savedHoroscope) : 'No saved horoscope' },
    { value: HOROSCOPE_MODE_UPLOAD, label: 'Upload Horoscope', disabled: false, hint: 'Attach a file for this question' },
    { value: HOROSCOPE_MODE_NONE, label: HOROSCOPE_MODE_NONE, disabled: false, hint: 'Not required for this question' },
  ]

  return (
    <Card>
      <div className="section-title" style={{ fontSize: 15 }}>Horoscope</div>
      <div className="muted" style={{ marginBottom: 12, marginTop: -6 }}>
        Optional. {hasSaved
          ? 'Use the horoscope already saved in your profile, or attach a new one for this question.'
          : 'No horoscope is saved in your profile yet. Save one in My Account, or attach a file for this question.'}
      </div>

      <div className="aq-horoscope-options" role="group" aria-label="Horoscope source">
        {options.map((option) => {
          const active = mode === option.value
          return (
            <button
              key={option.value}
              type="button"
              className={`aq-horoscope-option${active ? ' is-active' : ''}`}
              disabled={disabled || option.disabled}
              title={option.disabled ? 'Save your birth details in My Account to use this' : option.hint}
              onClick={() => onSelectMode(option.value)}
            >
              <span className="aq-horoscope-option__label">{option.label}</span>
              <span className="aq-horoscope-option__hint">{option.hint}</span>
            </button>
          )
        })}
      </div>

      {isSaved && (
        <div className="aq-horoscope-selected">
          <CheckCircle2 size={16} aria-hidden="true" />
          <div style={{ minWidth: 0 }}>
            <div className="aq-horoscope-selected__title">{getSavedHoroscopeLabel(savedHoroscope)}</div>
            <div className="aq-horoscope-selected__meta">{getSavedHoroscopeSummary(savedHoroscope)}</div>
          </div>
          <span className="aq-horoscope-selected__state">Selected</span>
        </div>
      )}

      {isUpload && (
        <div style={{ marginTop: 12 }}>
          {uploadedFile ? (
            <div className="aq-horoscope-selected">
              <FileText size={16} aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <div className="aq-horoscope-selected__title">{uploadedFile.name}</div>
                <div className="aq-horoscope-selected__meta">{formatFileSize(uploadedFile.size)} · ready to send with this question</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onRemoveFile}>Remove</button>
            </div>
          ) : (
            <UploadField
              label="Upload horoscope file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onFileSelect={onFileSelected}
              hint="PDF or image, up to 5 MB. It is attached to this question only."
            />
          )}
        </div>
      )}
    </Card>
  )
}

export default function QuestionFormModal({
  isEditing = false,
  title = 'Ask a Question',
  astrologerName = '',
  summary = null,
  category = '',
  creditForSelection = null,
  purchasedSlotForSelection = null,
  showDiscount = false,
  discountPrice = null,
  formError = '',
  horoscopeError = '',
  isGeneral = false,
  language = 'Tamil',
  onLanguageChange,
  question = '',
  onQuestionChange,
  raisedFor = 'Myself',
  onRaisedForChange,
  otherPersonName = '',
  onOtherPersonNameChange,
  savedHoroscope = null,
  horoscopeMode = HOROSCOPE_MODE_NONE,
  horoscopeFile = null,
  onSelectHoroscopeMode,
  onHoroscopeFileSelected,
  onRemoveHoroscopeFile,
  onClose,
  onSubmit,
  submitLabel = 'Submit Question',
}) {
  return createPortal((
    <div className="modal-overlay user-modal-overlay" onClick={onClose}>
      <div
        className="modal-card user-modal-card user-modal-card--scroll user-modal-card--ask"
        style={{ width: 'min(760px, calc(100vw - 32px))' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-question-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="user-modal-card__header flex items-center justify-between gap-4">
          <div>
            <div id="ask-question-popup-title" className="section-title" style={{ marginBottom: 0 }}>{title}</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {[
                summary?.astrologerName,
                summary?.sourceLabel,
                summary?.typeLabel,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {astrologerName && <span className="section-title" style={{ marginBottom: 0 }}>{astrologerName}</span>}
            <button type="button" className="icon-btn" aria-label="Close ask question popup" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isEditing && summary && (
            <section className="aq-form-section">
              <h2 className="aq-form-section__title">Your Selection</h2>
              <div className="aq-summary">
                <div className="aq-summary-row"><span>Astrologer</span><strong>{summary.astrologerName || '—'}</strong></div>
                <div className="aq-summary-row"><span>Source</span><strong>{summary.sourceLabel}</strong></div>
                <div className="aq-summary-row"><span>Question Type</span><strong>{summary.typeLabel}</strong></div>
                <div className="aq-summary-rule" />
                {creditForSelection ? (
                  // Paid earlier through "Pay & Ask Later": the amount was
                  // already paid, so nothing is charged again here.
                  <>
                    <div className="aq-summary-row"><span>Purchased Question</span><strong>{formatSlotAmount(creditForSelection.paidPrice)}</strong></div>
                    {getQuestionCreditOfferLabel(creditForSelection) ? (
                      <div className="aq-summary-row"><span>Offer</span><strong>{getQuestionCreditOfferLabel(creditForSelection)}</strong></div>
                    ) : null}
                    <div className="aq-summary-row"><span>Expires in</span><strong>{getQuestionCreditDaysRemaining(creditForSelection)} days</strong></div>
                    <div className="aq-summary-rule" />
                    <div className="aq-summary-row aq-summary-row--total"><span>Payment</span><strong>Already Purchased — No Additional Payment</strong></div>
                  </>
                ) : purchasedSlotForSelection ? (
                  <>
                    <div className="aq-summary-row"><span>Purchased Slots Left</span><strong>{purchasedSlotForSelection.remaining}</strong></div>
                    {purchasedSlotForSelection.pricing ? (
                      <>
                        <div className="aq-summary-row"><span>Original Price</span><strong>{formatSlotAmount(purchasedSlotForSelection.pricing.originalAmount)}</strong></div>
                        <div className="aq-summary-row"><span>Discount</span><strong>-{formatSlotAmount(purchasedSlotForSelection.pricing.discountAmount)}</strong></div>
                        <div className="aq-summary-row"><span>Paid at purchase</span><strong>{formatSlotAmount(purchasedSlotForSelection.pricing.paidAmount)}</strong></div>
                        <div className="aq-summary-row"><span>Mode</span><strong>Already paid</strong></div>
                      </>
                    ) : (
                      <div className="aq-summary-row"><span>Paid at purchase</span><strong>Not recorded</strong></div>
                    )}
                    <div className="aq-summary-row aq-summary-row--total"><span>Payment</span><strong>Already Purchased — No Additional Payment</strong></div>
                  </>
                ) : (
                  <>
                    <div className="aq-summary-row"><span>{summary.isOpenQuestion ? 'Ask Anything Price' : 'Campaign Price'}</span><strong>₹{summary.price}</strong></div>
                    {summary.offer && (
                      <>
                        <div className="aq-summary-row"><span>Offer</span><strong>{summary.offer.discountPercent}% off</strong></div>
                        <div className="aq-summary-row"><span>Discount</span><strong>-₹{summary.offer.discountAmount}</strong></div>
                      </>
                    )}
                    <div className="aq-summary-rule" />
                    <div className="aq-summary-row aq-summary-row--total"><span>You Pay</span><strong>₹{summary.offer?.offerPrice ?? summary.price}</strong></div>
                  </>
                )}
              </div>
            </section>
          )}

          {formError && (
            <div role="alert" className="aq-form-alert">{formError}</div>
          )}

          {horoscopeError && (
            <div role="alert" className="aq-form-alert">{horoscopeError}</div>
          )}

          {showDiscount && discountPrice && (
            <section className="aq-form-section">
              <h2 className="aq-form-section__title">Discount Question Applied</h2>
              <div className="aq-summary">
                <div className="aq-summary-row"><span>Normal Price ({category})</span><strong>₹{discountPrice.normalPrice}</strong></div>
                <div className="aq-summary-row"><span>Subscriber Discount</span><strong>{discountPrice.discountPercent}%</strong></div>
                <div className="aq-summary-row"><span>Discount</span><strong>-₹{discountPrice.discountAmount}</strong></div>
                <div className="aq-summary-rule" />
                <div className="aq-summary-row aq-summary-row--total"><span>You Pay</span><strong>₹{discountPrice.youPay}</strong></div>
              </div>
            </section>
          )}

          {isGeneral ? (
            <>
              <section className="aq-form-section">
                <h2 className="aq-form-section__title">General Question</h2>
                <p className="aq-form-section__hint">Simple layout for general questions. Add the minimum required details and submit.</p>
                <div className="field-group" style={{ marginBottom: 0 }}><label className="field-label-top">Preferred Language</label><select className="select-input" value={language} onChange={(event) => onLanguageChange(event.target.value)}>{LANGUAGES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <VoiceTextArea placeholder="Type your general question here, or tap the mic to speak it..." value={question} onChange={onQuestionChange} maxLength={QUESTION_CHAR_LIMIT} lang={SPEECH_LANG_BY_LANGUAGE[language]} />
              </section>
              <HoroscopeSection
                savedHoroscope={savedHoroscope}
                mode={horoscopeMode}
                uploadedFile={horoscopeFile}
                onSelectMode={onSelectHoroscopeMode}
                onFileSelected={onHoroscopeFileSelected}
                onRemoveFile={onRemoveHoroscopeFile}
              />
            </>
          ) : (
            <>
              <section className="aq-form-section">
                <h2 className="aq-form-section__title">Question Raised For</h2>
                <RadioGroup name="raised-for" options={RAISED_FOR} value={raisedFor} onChange={onRaisedForChange} />
                {raisedFor === 'Others' && <div className="field-group" style={{ marginTop: 16, marginBottom: 0 }}><label className="field-label-top">Person's Name</label><input type="text" className="text-input" placeholder="Enter their name" value={otherPersonName} onChange={(event) => onOtherPersonNameChange(event.target.value)} /></div>}
              </section>
              <section className="aq-form-section">
                <h2 className="aq-form-section__title">Preferred Language</h2>
                <RadioGroup name="language" options={LANGUAGES} value={language} onChange={onLanguageChange} />
              </section>
              <section className="aq-form-section">
                <h2 className="aq-form-section__title">Personal Question</h2>
                <p className="aq-form-section__hint">Detailed layout for personal questions. Add horoscope and supporting files.</p>
                <VoiceTextArea placeholder="Describe your question in detail, or tap the mic to speak it..." value={question} onChange={onQuestionChange} maxLength={QUESTION_CHAR_LIMIT} lang={SPEECH_LANG_BY_LANGUAGE[language]} />
              </section>
              <HoroscopeSection
                savedHoroscope={savedHoroscope}
                mode={horoscopeMode}
                uploadedFile={horoscopeFile}
                onSelectMode={onSelectHoroscopeMode}
                onFileSelected={onHoroscopeFileSelected}
                onRemoveFile={onRemoveHoroscopeFile}
              />
            </>
          )}
        </div>

        <div className="user-modal-card__footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit}>{submitLabel}</button>
        </div>
      </div>
    </div>
  ), document.body)
}