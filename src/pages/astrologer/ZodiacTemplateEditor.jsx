import { useRef, useState } from 'react'
import { Bold, Check, Eye, Italic, Link, List, ListOrdered, Pencil, Plus, Save, Underline, X } from 'lucide-react'
import './zodiacTemplateEditor.css'

const ZODIACS = [
  { sign: 'Aries', symbol: '♈', rasi: 'Mesha', en: 'Aries', nakshatras: 'Aswini · Bharani · Krittika · Rohini', element: 'Fire', dates: 'Mar 21 - Apr 19', ruler: 'Mars', luckyColor: 'Red', luckyNumber: 9 },
  { sign: 'Taurus', symbol: '♉', rasi: 'Rishaba', en: 'Taurus', nakshatras: 'Krittika · Rohini · Mrigashira · Ardra', element: 'Earth', dates: 'Apr 20 - May 20', ruler: 'Venus', luckyColor: 'Green', luckyNumber: 6 },
  { sign: 'Gemini', symbol: '♊', rasi: 'Mithuna', en: 'Gemini', nakshatras: 'Mrigashira · Ardra · Punarvasu · Pushya', element: 'Air', dates: 'May 21 - Jun 20', ruler: 'Mercury', luckyColor: 'Yellow', luckyNumber: 5 },
  { sign: 'Cancer', symbol: '♋', rasi: 'Kataka', en: 'Cancer', nakshatras: 'Pushya · Ashlesha · Magha · Purva Phalguni', element: 'Water', dates: 'Jun 21 - Jul 22', ruler: 'Moon', luckyColor: 'Silver', luckyNumber: 2 },
  { sign: 'Leo', symbol: '♌', rasi: 'Simha', en: 'Leo', nakshatras: 'Magha · Purva Phalguni · Uttara Phalguni · Hasta', element: 'Fire', dates: 'Jul 23 - Aug 22', ruler: 'Sun', luckyColor: 'Gold', luckyNumber: 1 },
  { sign: 'Virgo', symbol: '♍', rasi: 'Kanya', en: 'Virgo', nakshatras: 'Uttara Phalguni · Hasta · Chitra · Swati', element: 'Earth', dates: 'Aug 23 - Sep 22', ruler: 'Mercury', luckyColor: 'Navy', luckyNumber: 5 },
  { sign: 'Libra', symbol: '♎', rasi: 'Thula', en: 'Libra', nakshatras: 'Chitra · Swati · Vishakha · Anuradha', element: 'Air', dates: 'Sep 23 - Oct 22', ruler: 'Venus', luckyColor: 'Pink', luckyNumber: 7 },
  { sign: 'Scorpio', symbol: '♏', rasi: 'Vrishchika', en: 'Scorpio', nakshatras: 'Anuradha · Jyeshtha · Mula · Purva Ashadha', element: 'Water', dates: 'Oct 23 - Nov 21', ruler: 'Pluto', luckyColor: 'Maroon', luckyNumber: 8 },
  { sign: 'Sagittarius', symbol: '♐', rasi: 'Dhanusu', en: 'Sagittarius', nakshatras: 'Mula · Purva Ashadha · Uttara Ashadha · Shravana', element: 'Fire', dates: 'Nov 22 - Dec 21', ruler: 'Jupiter', luckyColor: 'Purple', luckyNumber: 3 },
  { sign: 'Capricorn', symbol: '♑', rasi: 'Makara', en: 'Capricorn', nakshatras: 'Shravana · Dhanishta · Shatabhisha · Purva Bhadrapada', element: 'Earth', dates: 'Dec 22 - Jan 19', ruler: 'Saturn', luckyColor: 'Brown', luckyNumber: 4 },
  { sign: 'Aquarius', symbol: '♒', rasi: 'Kumbha', en: 'Aquarius', nakshatras: 'Purva Bhadrapada · Uttara Bhadrapada · Revati · Aswini', element: 'Air', dates: 'Jan 20 - Feb 18', ruler: 'Uranus', luckyColor: 'Turquoise', luckyNumber: 11 },
  { sign: 'Pisces', symbol: '♓', rasi: 'Meena', en: 'Pisces', nakshatras: 'Uttara Bhadrapada · Revati · Aswini · Bharani', element: 'Water', dates: 'Feb 19 - Mar 20', ruler: 'Neptune', luckyColor: 'Sea Green', luckyNumber: 7 },
]

const SPECIALIZATIONS = [
  { name: 'Guru Peyarchi', deity: 'Dakshinamurthy', planet: 'Jupiter', temple: 'Alangudi Guru Sthalam', category: 'Planetary Transits', day: 'Thursday' },
  { name: 'Sani Peyarchi', deity: 'Shani Dev', planet: 'Saturn', temple: 'Tirunallar Saneeswaran', category: 'Planetary Transits', day: 'Saturday' },
  { name: 'Rahu-Ketu Peyarchi', deity: 'Naga Devata', planet: 'Rahu & Ketu', temple: 'Keezhperumpallam Ketu Sthalam', category: 'Planetary Transits', day: 'Saturday' },
  { name: 'Chevvai Dosham (Manglik)', deity: 'Murugan', planet: 'Mars', temple: 'Vaitheeswaran Koil', category: 'Doshams & Pariharams', day: 'Tuesday' },
  { name: 'Kala Sarpa Dosham', deity: 'Naga Devata', planet: 'Rahu & Ketu', temple: 'Srikalahasti', category: 'Doshams & Pariharams', day: 'Sunday' },
  { name: 'Pithru Dosham & Tarpanam', deity: 'Pitru Devatas', planet: 'Sun', temple: 'Rameswaram Agni Theertham', category: 'Doshams & Pariharams', day: 'Amavasya' },
  { name: 'Naga Dosham', deity: 'Naga Devata', planet: 'Rahu', temple: 'Mannarasala Nagaraja', category: 'Doshams & Pariharams', day: 'Ayilyam Nakshatra' },
  { name: 'Kalathra Dosham', deity: 'Parvati Parameshwara', planet: 'Venus', temple: 'Thirumanancheri Kalyanasundareswarar', category: 'Doshams & Pariharams', day: 'Friday' },
  { name: 'Pradosham & Sani Pradosham', deity: 'Shiva', planet: 'Saturn', temple: 'Thiruvannamalai Arunachaleswarar', category: 'Panchangam Rituals', day: 'Trayodashi' },
  { name: 'Amavasya & Pournami Rituals', deity: 'Chandra Dev', planet: 'Moon', temple: 'Rameswaram Jyotirlinga', category: 'Panchangam Rituals', day: 'Amavasya / Pournami' },
  { name: 'Navagraha Shanti Homam', deity: 'Navagrahas', planet: 'Nine Planets', temple: 'Suriyanar Koil', category: 'Panchangam Rituals', day: 'Sunday' },
  { name: 'Janma Nakshatra Shanti', deity: 'Ishta Devata', planet: 'Birth Star Lord', temple: 'Thirunallar Kshetra', category: 'Panchangam Rituals', day: 'Janma Nakshatra' },
]

const MODES = ['12 Zodiac Signs', 'Specializations (Jyotish Panchangam)']
const PERIODS = ['Daily', 'Weekly', 'Monthly']
const SPECIALIZATION_TABS = ['General Guidance', 'Remedies & Pariharam', 'Mantra & Rituals']
const ELEMENTS = ['All', 'Fire', 'Earth', 'Air', 'Water']
const ZODIAC_DEFAULTS = {
  Daily: 'Today brings a fresh wave of energy. Focus on your goals and trust your intuition to guide important decisions.',
  Weekly: 'This week highlights growth in relationships and career. Balance ambition with self-care for best results.',
  Monthly: 'The month ahead favors bold moves and new beginnings. Reflect on lessons learned and plan your next steps.',
}

const VEDIC_DEFAULTS = {
  'General Guidance': 'As this sacred event approaches, observe the planetary influence with awareness. Review the Panchangam, honor the presiding deity, and make space for a meaningful shift in your life path.',
  'Remedies & Pariharam': 'Begin this pariharam with a clear sankalpa. Offer prayers to the presiding deity, visit the recommended kshetra when possible, and practice the remedy with devotion and consistency.',
  'Mantra & Rituals': 'For the most auspicious results, begin after sunrise during the recommended muhurta. Chant the associated mantra with steady breath and complete the ritual with gratitude and a calm mind.',
}

const VEDIC_TAB_ALIASES = { 'General Guidance': 'Transit & Event Impact', 'Mantra & Rituals': 'Mantra & Ritual Timings' }

function initialFor(key, templates, defaults, aliases = {}) {
  const source = templates?.[key] || {}
  return Object.fromEntries(Object.entries(defaults).map(([tab, fallback]) => [tab, source[tab] ?? source[aliases[tab]] ?? fallback]))
}

function readSavedTemplates() {
  try {
    return JSON.parse(window.localStorage.getItem('astroconnect-follower-perks') || 'null')
  } catch {
    return null
  }
}

function buildTemplates(items, source, defaults, aliases = {}) {
  return Object.fromEntries(items.map((item) => [item, initialFor(item, source, defaults, aliases)]))
}

function buildNakshatraNotes(source = {}) {
  return Object.fromEntries(ZODIACS.map((zodiac) => [
    zodiac.sign,
    Object.fromEntries(zodiac.nakshatras.split(' · ').map((nakshatra) => [nakshatra, source[zodiac.sign]?.[nakshatra] || ''])),
  ]))
}

export default function ZodiacTemplateEditor({ initialTemplates, onChange }) {
  const [mode, setMode] = useState(MODES[0])
  const [selected, setSelected] = useState(ZODIACS[0].sign)
  const [selectedSpecialization, setSelectedSpecialization] = useState(SPECIALIZATIONS[0].name)
  const [customSpecializations, setCustomSpecializations] = useState(() => readSavedTemplates()?.customSpecializations || [])
  const [elementFilter, setElementFilter] = useState('All')
  const [period, setPeriod] = useState('Daily')
  const [specializationTab, setSpecializationTab] = useState(SPECIALIZATION_TABS[0])
  const [templates, setTemplates] = useState(() => buildTemplates(ZODIACS.map((z) => z.sign), readSavedTemplates()?.zodiac || initialTemplates, ZODIAC_DEFAULTS))
  const [specializationTemplates, setSpecializationTemplates] = useState(() => buildTemplates([...SPECIALIZATIONS, ...(readSavedTemplates()?.customSpecializations || [])].map((item) => item.name), readSavedTemplates()?.vedic || initialTemplates, VEDIC_DEFAULTS, VEDIC_TAB_ALIASES))
  const [savedTemplates, setSavedTemplates] = useState(() => {
    const stored = readSavedTemplates()
    return {
      zodiac: buildTemplates(ZODIACS.map((z) => z.sign), stored?.zodiac || initialTemplates, ZODIAC_DEFAULTS),
      vedic: buildTemplates(SPECIALIZATIONS.map((item) => item.name), stored?.vedic || initialTemplates, VEDIC_DEFAULTS, VEDIC_TAB_ALIASES),
    }
  })
  const [nakshatraNotes, setNakshatraNotes] = useState(() => buildNakshatraNotes(readSavedTemplates()?.nakshatraNotes))
  const [savedNakshatraNotes, setSavedNakshatraNotes] = useState(() => buildNakshatraNotes(readSavedTemplates()?.nakshatraNotes))
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)
  const textareaRef = useRef(null)

  const isVedicMode = mode === MODES[1]
  const allSpecializations = [...SPECIALIZATIONS, ...customSpecializations]
  const activeKey = isVedicMode ? selectedSpecialization : selected
  const activePeriod = isVedicMode ? specializationTab : period
  const activeDefaults = isVedicMode ? VEDIC_DEFAULTS : ZODIAC_DEFAULTS
  const activeTemplates = isVedicMode ? specializationTemplates : templates
  const activeItem = isVedicMode ? allSpecializations.find((item) => item.name === selectedSpecialization) : ZODIACS.find((item) => item.sign === selected)
  const previewText = activeTemplates[activeKey][activePeriod]
  const selectedNakshatras = isVedicMode ? [] : activeItem?.nakshatras.split(' · ') || []
  const selectedNotes = isVedicMode ? {} : nakshatraNotes[activeKey] || {}

  const update = (key, tab, value) => {
    if (isVedicMode) {
      setSpecializationTemplates((prev) => {
        const next = { ...prev, [key]: { ...prev[key], [tab]: value } }
        onChange?.(next)
        return next
      })
      return
    }
    setTemplates((prev) => {
      const next = { ...prev, [key]: { ...prev[key], [tab]: value } }
      onChange?.(next)
      return next
    })
  }

  const save = () => {
    const nextSaved = {
      ...savedTemplates,
      [isVedicMode ? 'vedic' : 'zodiac']: { ...(isVedicMode ? specializationTemplates : templates) },
      nakshatraNotes,
      customSpecializations,
    }
    setSavedTemplates(nextSaved)
    setSavedNakshatraNotes(buildNakshatraNotes(nakshatraNotes))
    window.localStorage.setItem('astroconnect-follower-perks', JSON.stringify(nextSaved))
    setEditing(false)
    setNotice(`${activeKey} template saved`)
    onChange?.(activeTemplates)
  }

  const cancel = () => {
    const source = savedTemplates[isVedicMode ? 'vedic' : 'zodiac']
    const restored = { ...(source[activeKey] || initialFor(activeKey, initialTemplates, activeDefaults, isVedicMode ? VEDIC_TAB_ALIASES : {})) }
    if (isVedicMode) setSpecializationTemplates((prev) => ({ ...prev, [activeKey]: restored }))
    else setTemplates((prev) => ({ ...prev, [activeKey]: restored }))
    if (!isVedicMode) setNakshatraNotes((prev) => ({ ...prev, [activeKey]: { ...(savedNakshatraNotes[activeKey] || {}) } }))
    setEditing(false)
    setNotice('Unsaved changes discarded')
  }

  const setNakshatraNote = (nakshatra, value) => {
    if (isVedicMode) return
    setNakshatraNotes((prev) => ({ ...prev, [activeKey]: { ...(prev[activeKey] || {}), [nakshatra]: value } }))
  }

  const createSpecialization = () => {
    const item = { name: `Custom Event ${customSpecializations.length + 1}`, deity: 'To be added', planet: 'To be added', temple: 'To be added', category: 'Custom Events', day: 'Any day' }
    const nextCustom = [...customSpecializations, item]
    setCustomSpecializations(nextCustom)
    setSpecializationTemplates((prev) => ({ ...prev, [item.name]: initialFor(item.name, {}, VEDIC_DEFAULTS, VEDIC_TAB_ALIASES) }))
    setSelectedSpecialization(item.name)
    setEditing(true)
    setNotice(`${item.name} created`)
  }

  const applyTemplate = (value) => {
    if (!value) return
    update(activeKey, activePeriod, value)
    setEditing(true)
  }

  const formatSelection = (prefix, suffix = prefix) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = previewText.slice(start, end) || 'text'
    update(activeKey, activePeriod, `${previewText.slice(0, start)}${prefix}${selectedText}${suffix}${previewText.slice(end)}`)
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(start + prefix.length, end + prefix.length) })
  }

  const visibleZodiacs = ZODIACS.filter((zodiac) => elementFilter === 'All' || zodiac.element === elementFilter)

  return (
    <section className="zte">
      <header className="zte-header"><h2 className="zte-title">Follower Perks &amp; Benefits</h2><p className="zte-sub">Create personalized guidance for zodiac signs and Jyotish Panchangam events.</p></header>

      <div className="zte-mode-toggle" role="tablist" aria-label="Template type">
        {MODES.map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} className={`zte-mode${mode === item ? ' zte-mode-active' : ''}`} onClick={() => { setMode(item); setNotice(null) }}>{item}</button>)}
      </div>

      <div className="zte-body">
        <div className="zte-zodiac-column">
          {!isVedicMode ? <>
            <div className="zte-section-heading"><span>1</span><div><h3>12 Zodiac Signs</h3><p>12 Rasis</p></div></div>
            <div className="zte-grid" role="listbox" aria-label="Zodiac signs">
              {visibleZodiacs.map((zodiac) => { const isSelected = zodiac.sign === selected; return <button key={zodiac.sign} type="button" role="option" aria-selected={isSelected} className={`zte-sign${isSelected ? ' zte-sign-selected' : ''}`} onClick={() => setSelected(zodiac.sign)}><span className="zte-symbol" aria-hidden="true">{zodiac.symbol}</span><span className="zte-sign-copy"><span className="zte-name">{zodiac.en} <small>({zodiac.rasi})</small></span><span className="zte-nakshatras">{zodiac.nakshatras}</span></span><span className="zte-sign-arrow" aria-hidden="true">›</span>{isSelected && <Check className="zte-check" size={14} aria-hidden="true" />}</button> })}
            </div>
          </> : <>
            <div className="zte-section-heading"><span>2</span><div><h3>Specializations</h3><p>Hindu Astrological Events and Rituals · Jyotish Panchangam</p></div><button type="button" className="zte-add-button" onClick={createSpecialization}><Plus size={14} /> Create New</button></div>
            <div className="zte-special-grid" role="listbox" aria-label="Hindu astrological events and rituals">
              {allSpecializations.map((item) => <button key={item.name} type="button" role="option" aria-selected={item.name === selectedSpecialization} className={`zte-special-card${item.name === selectedSpecialization ? ' zte-sign-selected' : ''}`} onClick={() => setSelectedSpecialization(item.name)}><span className="zte-special-icon" aria-hidden="true">ॐ</span><span className="zte-special-copy"><strong>{item.name}</strong><span>{item.category}</span></span><span className="zte-special-arrow" aria-hidden="true">›</span>{item.name === selectedSpecialization && <Check className="zte-check" size={14} aria-hidden="true" />}</button>)}
            </div>
          </>}
        </div>

      <div className="zte-workspace">
        <div className="zte-panel">
          <div className="zte-panel-head"><div><span className="zte-selected-label">{isVedicMode ? activeItem?.name : `${activeItem?.symbol} ${activeItem?.en} (${activeItem?.rasi})`}</span><span className="zte-sign-meta">{isVedicMode ? `${activeItem?.category} · Auspicious: ${activeItem?.day}` : `${activeItem?.dates} · ${activeItem?.element}`}</span>{!isVedicMode && <span className="zte-selected-nakshatras">{activeItem?.nakshatras}</span>}</div><span className="zte-ruler">{isVedicMode ? `${activeItem?.planet} · ${activeItem?.deity}` : `Ruled by ${activeItem?.ruler}`}</span></div>
          {isVedicMode && <div className="zte-vedic-meta"><span>Deity: {activeItem?.deity}</span><span>Planet: {activeItem?.planet}</span><span>Kshetra: {activeItem?.temple}</span></div>}
          <div className="zte-tabs" role="tablist" aria-label={isVedicMode ? 'Specialization template' : 'Template period'}>{(isVedicMode ? SPECIALIZATION_TABS : PERIODS).map((item) => { const active = activePeriod === item; return <button key={item} type="button" role="tab" aria-selected={active} className={`zte-tab${active ? ' zte-tab-active' : ''}`} onClick={() => isVedicMode ? setSpecializationTab(item) : setPeriod(item)}>{item}</button> })}</div>
          <div className="zte-editor-heading"><span className="zte-field-label">{activePeriod} Perk Template</span><label className="zte-template-select"><span>Use Template</span><select value="" onChange={(event) => applyTemplate(event.target.value)} disabled={!editing}><option value="">Choose a template</option><option value={activeDefaults[activePeriod]}>Standard guidance</option><option value="Focus on practical steps and trust your inner wisdom as this period unfolds.">Practical guidance</option><option value="Make space for reflection, connection, and a hopeful next step.">Encouraging guidance</option></select></label></div>
          <div className={`zte-rich-editor${!editing ? ' is-readonly' : ''}`}>
            <div className="zte-editor-toolbar" aria-label="Text formatting">
              <button type="button" aria-label="Bold" onClick={() => formatSelection('**')} disabled={!editing}><Bold size={15} /></button>
              <button type="button" aria-label="Italic" onClick={() => formatSelection('_')} disabled={!editing}><Italic size={15} /></button>
              <button type="button" aria-label="Underline" onClick={() => formatSelection('<u>', '</u>')} disabled={!editing}><Underline size={15} /></button>
              <button type="button" aria-label="Bulleted list" onClick={() => formatSelection('• ')} disabled={!editing}><List size={15} /></button>
              <button type="button" aria-label="Numbered list" onClick={() => formatSelection('1. ')} disabled={!editing}><ListOrdered size={15} /></button>
              <button type="button" aria-label="Insert link" onClick={() => formatSelection('[', '](url)')} disabled={!editing}><Link size={15} /></button>
            </div>
            <textarea ref={textareaRef} className="zte-textarea" value={previewText} onChange={(e) => update(activeKey, activePeriod, e.target.value)} placeholder={activeDefaults[activePeriod]} rows={7} readOnly={!editing} />
          </div>
          {!isVedicMode && <section className="zte-nakshatra-notes" aria-labelledby="nakshatra-notes-title"><div className="zte-notes-heading"><div><h3 id="nakshatra-notes-title">Nakshatra Specific Notes</h3><p>Add separate notes for each Nakshatra (optional).</p></div></div><div className="zte-notes-list">{selectedNakshatras.map((nakshatra) => <label className="zte-note-row" key={nakshatra}><strong>{nakshatra}</strong><textarea value={selectedNotes[nakshatra] || ''} onChange={(event) => setNakshatraNote(nakshatra, event.target.value)} placeholder={`+ Add note for ${nakshatra}`} rows={2} readOnly={!editing} /></label>)}</div></section>}
          <div className="zte-actions"><button type="button" className="zte-preview-btn" onClick={() => { setPreviewOpen(true); setNotice('Preview updated') }}><Eye size={15} aria-hidden="true" /> Preview</button><button type="button" className="zte-save" onClick={save} disabled={!editing}><Save size={15} aria-hidden="true" /> Save</button><button type="button" className="zte-secondary zte-edit-btn" onClick={() => { setEditing(true); textareaRef.current?.focus() }}><Pencil size={15} aria-hidden="true" /> Edit</button>{notice && <span className="zte-saved" role="status">{notice}</span>}</div>
        </div>

        {previewOpen && <aside className={`zte-preview${isVedicMode ? ' zte-preview-vedic' : ''}`} aria-label="Live follower preview"><div className="zte-preview-heading"><span><Eye size={17} /> Preview - {activeItem?.name || activeItem?.en} ({activePeriod})</span><button type="button" aria-label="Close preview" onClick={() => setPreviewOpen(false)}><X size={18} /></button></div><div className="zte-profile"><div className="zte-avatar" aria-hidden="true">DR</div><div><strong>Dr. Rani</strong><span>{isVedicMode ? 'Jyotish Panchangam guidance' : `Guidance for ${activeItem?.en}`}</span></div><span className="zte-preview-symbol" aria-hidden="true">{isVedicMode ? 'ॐ' : activeItem?.symbol}</span></div><div className="zte-preview-nakshatras">{isVedicMode ? `${activeItem?.category} · ${activeItem?.day}` : activeItem?.nakshatras}</div>{isVedicMode ? <><div className="zte-blessing">🙏 Blessings of {activeItem?.deity}</div><div className="zte-temple-pill">⌾ {activeItem?.temple}</div></> : <div className="zte-preview-period">{activePeriod} Perk</div>}<p className="zte-preview-text">{previewText || 'Your personalized guidance will appear here.'}</p>{isVedicMode && <div className="zte-preview-sections">{SPECIALIZATION_TABS.map((tab) => <div className={tab === activePeriod ? 'is-active' : ''} key={tab}><strong>{tab}</strong><p>{activeTemplates[activeKey][tab] || 'No content added yet.'}</p></div>)}</div>}{!isVedicMode && Object.entries(selectedNotes).some(([, note]) => note.trim()) && <div className="zte-preview-notes"><strong>Nakshatra Specific Notes</strong>{Object.entries(selectedNotes).filter(([, note]) => note.trim()).map(([nakshatra, note]) => <div className="zte-preview-note" key={nakshatra}><span>{nakshatra}</span><p>{note}</p></div>)}</div>}{isVedicMode ? <div className="zte-lucky-pills"><span>✦ {activeItem?.planet}</span><span>☀ {activeItem?.day}</span></div> : <div className="zte-lucky-pills"><span>✦ {activeItem?.luckyColor}</span><span>♧ Lucky {activeItem?.luckyNumber}</span></div>}</aside>}
      </div>
      </div>
    </section>
  )
}
