import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import SummaryCard from '../../../components/ui/SummaryCard.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import PurchasedQuestionCard from '../../../components/user/PurchasedQuestionCard.jsx'
import QuestionFormModal from '../../../components/user/QuestionFormModal.jsx'
import CampaignCard, {
  CampaignEmptyState,
  CampaignStatusChip,
} from '../../../components/campaigns/CampaignCard.jsx'
import { campaignCardStatusStyle } from '../../../components/campaigns/campaignCardTokens.js'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { mockAstrologers } from '../../../data/notificationData.js'
import { categories } from '../../../data/mockData.js'
import { validateAttachmentFile } from '../../../utils/answer.js'
import {
  HOROSCOPE_MODE_NONE,
  HOROSCOPE_MODE_SAVED,
  HOROSCOPE_MODE_UPLOAD,
  buildQuestionHoroscope,
  getDefaultHoroscopeMode,
  readSavedHoroscope,
  validateHoroscopeSelection,
} from '../../../utils/horoscope.js'
import { formatSlotAmount, formatSlotPurchaseDate, getSlotTypeCards } from '../../../utils/purchasedSlots.js'
import { QUESTION_CREDIT_AVAILABLE, getQuestionCreditsForUser } from '../../../utils/questionCredits.js'
import {
  PURCHASED_FILTERS,
  filterPurchasedRecords,
  getSlotCardStatus,
  summarizePurchasedRecords,
} from '../../../utils/purchasedQuestionRecords.js'

const QUESTION_CHAR_LIMIT = 500

// Same title-card treatment as the disputes and history buckets.
const FILTER_META = {
  All: { label: 'Total Purchased', background: 'var(--primary-bg)', color: 'var(--primary)', border: 'rgba(91, 33, 182, 0.20)', hint: 'Every purchase across all astrologers' },
  Available: { label: 'Available', background: 'var(--success-bg)', color: 'var(--green-600)', border: 'rgba(16, 185, 129, 0.30)', hint: 'Ready to write and submit' },
  Used: { label: 'Used', background: 'var(--sky-bg)', color: 'var(--sky-600)', border: 'rgba(14, 165, 233, 0.28)', hint: 'Already submitted' },
  Expired: { label: 'Expired', background: 'var(--neutral-bg)', color: 'var(--muted)', border: 'rgba(100, 116, 139, 0.24)', hint: 'Redemption window closed' },
}

// Recorded receipt values only. A legacy slot without a pricing snapshot reads
// "not recorded" instead of being invented as a ₹0 payment.
function paidAmountLabel(card) {
  return card.pricing && card.pricing.paidAmount != null
    ? formatSlotAmount(card.pricing.paidAmount)
    : 'Not recorded'
}

function purchasedOnLabel(card) {
  return card.pricing?.purchasedAt ? formatSlotPurchaseDate(card.pricing.purchasedAt) : 'Not recorded'
}

function questionTypePillLabel(type) {
  return type === 'General' ? 'General' : 'Personal'
}

// Dedicated purchased-questions ledger for the "Pay Now & Ask Later" flow. It
// reads directly from the credits already stored on the user's purchased-slot
// records, so it is the same source of truth as My Questions - not a second
// store. Nothing here creates or mutates a purchase.
//
// The tab also owns the consolidated purchased-slot packages (moved here from
// the user dashboard): every package the user bought, across all astrologers,
// with the same card design the Ask Question slot list uses. "Use a Slot" opens
// the shared question-entry modal on top of this tab, pre-selecting the
// package's astrologer and question type, and runs the normal submit flow - no
// second payment, and the slot is only consumed when the question is created.
export default function QuestionPurchased() {
  const navigate = useNavigate()
  const { campaigns, purchasedSlots, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [filter, setFilter] = useState('All')
  const [openSlotKey, setOpenSlotKey] = useState(null)
  const [slotQuestion, setSlotQuestion] = useState('')
  const [slotLanguage, setSlotLanguage] = useState('Tamil')
  const [slotRaisedFor, setSlotRaisedFor] = useState('Myself')
  const [slotOtherName, setSlotOtherName] = useState('')
  const [slotHoroscope, setSlotHoroscope] = useState(HOROSCOPE_MODE_NONE)
  const [slotHoroscopeFile, setSlotHoroscopeFile] = useState(null)
  const [slotFormError, setSlotFormError] = useState('')
  const [slotHoroscopeError, setSlotHoroscopeError] = useState('')
  const [slotSuccessMessage, setSlotSuccessMessage] = useState('')
  const submittingRef = useRef(false)

  const credits = useMemo(
    () => getQuestionCreditsForUser(purchasedSlots, currentUser),
    [purchasedSlots, currentUser],
  )

  // Campaign-backed packages only: those carry a campaign to open. Balance rows
  // of Open Question credits have no campaign and are already listed as
  // purchasable questions below, so they are not repeated as slot cards.
  const slotCards = useMemo(
    () => getSlotTypeCards(purchasedSlots, currentUser, { campaigns, astrologers: mockAstrologers, includeUsed: true })
      .filter((card) => Boolean(card.campaign)),
    [campaigns, currentUser, purchasedSlots],
  )

  // One record list feeds both the summary counts and the list filters, so a
  // count can never include a record that its filter then hides. Counts are
  // record counts (not consumed-slot quantities): a partially used package is
  // Available until its last slot is consumed, and only then becomes Used.
  const { records, counts } = useMemo(
    () => summarizePurchasedRecords({ slotCards, credits }),
    [credits, slotCards],
  )

  const visibleRecords = useMemo(
    () => filterPurchasedRecords(records, filter),
    [filter, records],
  )

  const visibleSlotCards = useMemo(
    () => visibleRecords.filter((record) => record.kind === 'slot').map((record) => record.card),
    [visibleRecords],
  )

  const visibleCredits = useMemo(
    () => visibleRecords.filter((record) => record.kind === 'credit').map((record) => record.credit),
    [visibleRecords],
  )

  // Resolves the opened slot card against the current records, so the receipt
  // and the remaining count always reflect the latest purchased balance.
  const selectedCard = useMemo(
    () => slotCards.find((card) => card.key === openSlotKey) || null,
    [openSlotKey, slotCards],
  )

  const savedHoroscope = useMemo(() => readSavedHoroscope(currentUser), [currentUser])

  // Safety net for a record that already claims the saved horoscope: a saved
  // horoscope removed while the form was open must never be claimed.
  useEffect(() => {
    if (slotHoroscope === HOROSCOPE_MODE_SAVED && !savedHoroscope?.exists) setSlotHoroscope(HOROSCOPE_MODE_NONE)
  }, [slotHoroscope, savedHoroscope])

  const selectSlotHoroscopeMode = (mode) => {
    setSlotHoroscope(mode)
    setSlotHoroscopeError('')
    if (mode !== HOROSCOPE_MODE_UPLOAD) setSlotHoroscopeFile(null)
  }

  const handleSlotHoroscopeFile = (file) => {
    if (!file) {
      setSlotHoroscopeFile(null)
      return
    }
    const result = validateAttachmentFile(file, 'image')
    const pdfResult = result.ok ? result : validateAttachmentFile(file, 'pdf')
    if (!pdfResult.ok) {
      setSlotHoroscopeError(pdfResult.error)
      return
    }
    const kind = result.ok ? 'image' : 'pdf'
    setSlotHoroscopeError('')
    const reader = new FileReader()
    reader.onload = () => setSlotHoroscopeFile({
      id: `horoscope-${Date.now()}`,
      kind,
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: reader.result,
    })
    reader.readAsDataURL(file)
  }

  const openSlotForm = (card) => {
    if (!card.campaign || card.remaining <= 0) return
    setOpenSlotKey(card.key)
    setSlotQuestion('')
    setSlotLanguage('Tamil')
    setSlotRaisedFor('Myself')
    setSlotOtherName('')
    setSlotHoroscope(getDefaultHoroscopeMode({ questionType: card.type, savedHoroscope }))
    setSlotHoroscopeFile(null)
    setSlotFormError('')
    setSlotHoroscopeError('')
  }

  // Reuses the existing redemption deep link: AskQuestion restores this credit's
  // astrologer, campaign and question type, then opens the normal question form.
  const askYourQuestion = (credit) => {
    navigate(`${routes.askQuestion}?redeemCreditId=${encodeURIComponent(credit.id)}`)
  }

  const submitSlotQuestion = () => {
    if (submittingRef.current) return
    if (!selectedCard || !selectedCard.campaign) return

    if (!slotQuestion.trim()) {
      setSlotFormError('Enter your question before submitting.')
      return
    }
    if (slotQuestion.trim().length > QUESTION_CHAR_LIMIT) {
      setSlotFormError(`Keep your question under ${QUESTION_CHAR_LIMIT} characters.`)
      return
    }
    const isPersonal = selectedCard.type !== 'General'
    if (isPersonal && slotRaisedFor === 'Others' && !slotOtherName.trim()) {
      setSlotFormError("Enter the person's name for a personal question.")
      return
    }
    const horoscopeValidation = validateHoroscopeSelection({
      mode: slotHoroscope,
      savedHoroscope,
      uploadedFile: slotHoroscopeFile,
    })
    if (horoscopeValidation) {
      setSlotFormError('')
      setSlotHoroscopeError(horoscopeValidation)
      return
    }
    // Re-check the live balance so a slot consumed elsewhere (or a double-click
    // before state settled) can never submit a second question on one slot.
    if (selectedCard.remaining <= 0) {
      setSlotFormError('This slot has already been used.')
      return
    }

    submittingRef.current = true
    setSlotFormError('')
    setSlotHoroscopeError('')

    const horoscopePayload = buildQuestionHoroscope({
      mode: slotHoroscope,
      savedHoroscope,
      uploadedFile: slotHoroscopeFile,
      userId: currentUser?.id || '',
    })
    const slotType = isPersonal ? 'Personal' : 'General'
    const slotCategory = selectedCard.campaign.categories?.length
      ? selectedCard.campaign.categories.map((cat) => cat.name)
      : categories
    const category = slotCategory[0]

    const nextId = actions.createQuestion({
      userName: currentUser?.name,
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      campaignId: selectedCard.campaignId,
      campaignName: selectedCard.campaignName,
      astrologerId: selectedCard.astrologerId || selectedCard.campaign.astrologerId || null,
      type: isPersonal ? 'Personal' : 'General',
      category,
      questionFor: slotRaisedFor === 'Others' && slotOtherName.trim() ? slotOtherName.trim() : slotRaisedFor,
      language: slotLanguage,
      question: slotQuestion,
      horoscopeMode: horoscopePayload.horoscopeMode,
      horoscopeSource: horoscopePayload.horoscopeSource,
      horoscopeReference: horoscopePayload.horoscopeReference,
      horoscopeAttachment: horoscopePayload.horoscopeAttachment,
      customer: horoscopePayload.customer,
      attachmentNames: horoscopePayload.attachmentNames,
      purchaseType: 'Purchased Slot',
      purchaseAmount: 0,
      slotType,
      creditCampaignId: selectedCard.campaignId,
    })
    submittingRef.current = false

    if (nextId) {
      setOpenSlotKey(null)
      setSlotSuccessMessage('Your question has been submitted using your purchased slot.')
    } else {
      setSlotFormError('This astrologer has reached the monthly question limit. Please try again later.')
    }
  }

  return (
    <div>
      <Section title="Purchased Questions" titleRight={<span className="muted">{counts.Available} available to write</span>}>
        <div className="grid grid-cols-2 items-stretch gap-4 lg:grid-cols-4" style={{ gridAutoRows: 'minmax(132px, 1fr)' }}>
          {PURCHASED_FILTERS.map((key) => {
            const meta = FILTER_META[key]
            return (
              <div key={key} className="h-full" style={{ minHeight: 132 }}>
                <SummaryCard
                  label={meta.label}
                  value={counts[key] || 0}
                  hint={meta.hint}
                  background={meta.background}
                  color={meta.color}
                  border={meta.border}
                  onClick={() => setFilter(filter === key && key !== 'All' ? 'All' : key)}
                  active={filter === key}
                />
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 28 }}>
          {counts.All === 0 ? (
            <CampaignEmptyState
              icon={<Sparkles size={24} aria-hidden="true" />}
              title="No purchased slots"
              message="You have not bought a question package yet. A package banks General or Personal questions with an astrologer that you can submit any time."
              action={(
                <button type="button" className="btn btn-primary" onClick={() => navigate(routes.purchasePackage)}>
                  Purchase Question Package
                </button>
              )}
            />
          ) : visibleSlotCards.length === 0 && visibleCredits.length === 0 ? (
            <Card>
              <div className="muted">No purchases match the {filter} filter.</div>
            </Card>
          ) : (
            <>
              {visibleSlotCards.length > 0 && (
                <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleSlotCards.map((card) => {
                    const canUse = getSlotCardStatus(card) === QUESTION_CREDIT_AVAILABLE
                    const cardStyle = campaignCardStatusStyle(canUse ? 'Active' : 'Completed')
                    return (
                      <CampaignCard
                        key={card.key}
                        status={canUse ? 'Active' : 'Completed'}
                        name={card.campaign.name}
                        subtitle={card.astrologerName}
                        description={card.campaign.shortDescription}
                        chips={[
                          <CampaignStatusChip key="type" style={{ background: cardStyle.softBg, color: cardStyle.accent, border: `1px solid ${cardStyle.border}` }}>
                            {questionTypePillLabel(card.type)}
                          </CampaignStatusChip>,
                          ...(card.demo ? [
                            <CampaignStatusChip key="demo" style={{ background: '#fdf6e3', color: '#8a6d1a', border: '1px solid #ead9a6' }}>
                              Sample data
                            </CampaignStatusChip>,
                          ] : []),
                        ]}
                        details={[
                          { label: 'Purchased', value: `${card.purchased} slots` },
                          { label: 'Used', value: `${card.used}` },
                          { label: 'Remaining', value: `${card.remaining}` },
                          { label: 'Paid', value: paidAmountLabel(card) },
                          { label: 'Purchased on', value: purchasedOnLabel(card) },
                          { label: 'Schedule', value: `${card.campaign.date} – ${card.campaign.endDate}` },
                        ]}
                        footer={(
                          canUse ? (
                            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => openSlotForm(card)}>
                              Use a Slot
                            </button>
                          ) : (
                            <div className="muted" style={{ textAlign: 'center', fontSize: 13, fontWeight: 700 }}>
                              All slots used
                            </div>
                          )
                        )}
                      />
                    )
                  })}
                </div>
              )}

              {visibleCredits.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ marginTop: visibleSlotCards.length > 0 ? 24 : 0 }}>
                  {visibleCredits.map((credit) => (
                    <PurchasedQuestionCard key={credit.id} credit={credit} onAsk={askYourQuestion} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {slotSuccessMessage && (
        <SuccessAlert
          variant="user"
          message={slotSuccessMessage}
          onDismiss={() => setSlotSuccessMessage('')}
          actionLabel="view status"
          onAction={() => {
            setSlotSuccessMessage('')
            navigate(routes.trackQuestions)
          }}
        />
      )}

      {openSlotKey && selectedCard && (
        <QuestionFormModal
          isEditing={false}
          title="Use a Slot"
          astrologerName={selectedCard.astrologerName}
          summary={{
            astrologerName: selectedCard.astrologerName,
            sourceLabel: selectedCard.campaignName,
            typeLabel: selectedCard.type === 'General' ? 'General Question' : 'Personal Question',
            price: 0,
            offer: null,
            isOpenQuestion: false,
          }}
          category={selectedCard.campaign.categories?.length
            ? selectedCard.campaign.categories[0].name
            : categories[0]}
          creditForSelection={null}
          purchasedSlotForSelection={{ remaining: selectedCard.remaining, pricing: selectedCard.pricing }}
          showDiscount={false}
          discountPrice={null}
          formError={slotFormError}
          horoscopeError={slotHoroscopeError}
          isGeneral={selectedCard.type === 'General'}
          language={slotLanguage}
          onLanguageChange={setSlotLanguage}
          question={slotQuestion}
          onQuestionChange={setSlotQuestion}
          raisedFor={slotRaisedFor}
          onRaisedForChange={setSlotRaisedFor}
          otherPersonName={slotOtherName}
          onOtherPersonNameChange={setSlotOtherName}
          savedHoroscope={savedHoroscope}
          horoscopeMode={slotHoroscope}
          horoscopeFile={slotHoroscopeFile}
          onSelectHoroscopeMode={selectSlotHoroscopeMode}
          onHoroscopeFileSelected={handleSlotHoroscopeFile}
          onRemoveHoroscopeFile={() => { setSlotHoroscopeFile(null); setSlotHoroscopeError('') }}
          onClose={() => setOpenSlotKey(null)}
          onSubmit={submitSlotQuestion}
        />
      )}
    </div>
  )
}