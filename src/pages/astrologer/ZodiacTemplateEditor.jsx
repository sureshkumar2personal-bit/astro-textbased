import { useState } from 'react'
import { Check, Copy, RotateCcw, Save } from 'lucide-react'
import './zodiacTemplateEditor.css'

const ZODIACS = [
  { sign: 'Aries', symbol: '♈', en: 'Aries', element: 'Fire', dates: 'Mar 21 - Apr 19', ruler: 'Mars', luckyColor: 'Red', luckyNumber: 9 },
  { sign: 'Taurus', symbol: '♉', en: 'Taurus', element: 'Earth', dates: 'Apr 20 - May 20', ruler: 'Venus', luckyColor: 'Green', luckyNumber: 6 },
  { sign: 'Gemini', symbol: '♊', en: 'Gemini', element: 'Air', dates: 'May 21 - Jun 20', ruler: 'Mercury', luckyColor: 'Yellow', luckyNumber: 5 },
  { sign: 'Cancer', symbol: '♋', en: 'Cancer', element: 'Water', dates: 'Jun 21 - Jul 22', ruler: 'Moon', luckyColor: 'Silver', luckyNumber: 2 },
  { sign: 'Leo', symbol: '♌', en: 'Leo', element: 'Fire', dates: 'Jul 23 - Aug 22', ruler: 'Sun', luckyColor: 'Gold', luckyNumber: 1 },
  { sign: 'Virgo', symbol: '♍', en: 'Virgo', element: 'Earth', dates: 'Aug 23 - Sep 22', ruler: 'Mercury', luckyColor: 'Navy', luckyNumber: 5 },
  { sign: 'Libra', symbol: '♎', en: 'Libra', element: 'Air', dates: 'Sep 23 - Oct 22', ruler: 'Venus', luckyColor: 'Pink', luckyNumber: 7 },
  { sign: 'Scorpio', symbol: '♏', en: 'Scorpio', element: 'Water', dates: 'Oct 23 - Nov 21', ruler: 'Pluto', luckyColor: 'Maroon', luckyNumber: 8 },
  { sign: 'Sagittarius', symbol: '♐', en: 'Sagittarius', element: 'Fire', dates: 'Nov 22 - Dec 21', ruler: 'Jupiter', luckyColor: 'Purple', luckyNumber: 3 },
  { sign: 'Capricorn', symbol: '♑', en: 'Capricorn', element: 'Earth', dates: 'Dec 22 - Jan 19', ruler: 'Saturn', luckyColor: 'Brown', luckyNumber: 4 },
  { sign: 'Aquarius', symbol: '♒', en: 'Aquarius', element: 'Air', dates: 'Jan 20 - Feb 18', ruler: 'Uranus', luckyColor: 'Turquoise', luckyNumber: 11 },
  { sign: 'Pisces', symbol: '♓', en: 'Pisces', element: 'Water', dates: 'Feb 19 - Mar 20', ruler: 'Neptune', luckyColor: 'Sea Green', luckyNumber: 7 },
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
const SPECIALIZATION_TABS = ['Transit & Event Impact', 'Remedies & Pariharam', 'Mantra & Ritual Timings']
const ELEMENTS = ['All', 'Fire', 'Earth', 'Air', 'Water']
const INSPIRATION_CHIPS = ['Trust your intuition', 'A fresh start is near', 'Make space for joy', 'Lead with kindness']
const VEDIC_CHIPS = ['Chant Gayatri 108x', 'Sesame oil lamp on Saturday', 'Visit Parihara Sthalam', 'Offer water to Surya']

const ZODIAC_DEFAULTS = {
  Daily: 'Today brings a fresh wave of energy. Focus on your goals and trust your intuition to guide important decisions.',
  Weekly: 'This week highlights growth in relationships and career. Balance ambition with self-care for best results.',
  Monthly: 'The month ahead favors bold moves and new beginnings. Reflect on lessons learned and plan your next steps.',
}

const VEDIC_DEFAULTS = {
  'Transit & Event Impact': 'As this sacred event approaches, observe the planetary influence with awareness. Review the Panchangam, honor the presiding deity, and make space for a meaningful shift in your life path.',
  'Remedies & Pariharam': 'Begin this pariharam with a clear sankalpa. Offer prayers to the presiding deity, visit the recommended kshetra when possible, and practice the remedy with devotion and consistency.',
  'Mantra & Ritual Timings': 'For the most auspicious results, begin after sunrise during the recommended muhurta. Chant the associated mantra with steady breath and complete the ritual with gratitude and a calm mind.',
}

function initialFor(key, templates, defaults) {
  const source = templates?.[key] || {}
  return Object.fromEntries(Object.entries(defaults).map(([tab, fallback]) => [tab, source[tab] ?? fallback]))
}

export default function ZodiacTemplateEditor({ initialTemplates, onChange }) {
  const [mode, setMode] = useState(MODES[0])
  const [selected, setSelected] = useState(ZODIACS[0].sign)
  const [selectedSpecialization, setSelectedSpecialization] = useState(SPECIALIZATIONS[0].name)
  const [elementFilter, setElementFilter] = useState('All')
  const [period, setPeriod] = useState('Daily')
  const [specializationTab, setSpecializationTab] = useState(SPECIALIZATION_TABS[0])
  const [templates, setTemplates] = useState(() => Object.fromEntries(ZODIACS.map((z) => [z.sign, initialFor(z.sign, initialTemplates, ZODIAC_DEFAULTS)])))
  const [specializationTemplates, setSpecializationTemplates] = useState(() => Object.fromEntries(SPECIALIZATIONS.map((item) => [item.name, initialFor(item.name, initialTemplates, VEDIC_DEFAULTS)])))
  const [notice, setNotice] = useState(null)

  const isVedicMode = mode === MODES[1]
  const activeKey = isVedicMode ? selectedSpecialization : selected
  const activePeriod = isVedicMode ? specializationTab : period
  const activeDefaults = isVedicMode ? VEDIC_DEFAULTS : ZODIAC_DEFAULTS
  const activeTemplates = isVedicMode ? specializationTemplates : templates
  const activeItem = isVedicMode ? SPECIALIZATIONS.find((item) => item.name === selectedSpecialization) : ZODIACS.find((item) => item.sign === selected)
  const previewText = activeTemplates[activeKey][activePeriod]

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

  const save = () => { setNotice(`${activeKey} template saved`); onChange?.(activeTemplates) }

  const appendInspiration = (text) => {
    const current = activeTemplates[activeKey][activePeriod].trim()
    update(activeKey, activePeriod, current ? `${current} ${text}.` : `${text}.`)
  }

  const copyToAll = () => {
    const source = activeTemplates[activeKey]
    if (isVedicMode) {
      const next = Object.fromEntries(SPECIALIZATIONS.map((item) => [item.name, { ...source }]))
      setSpecializationTemplates(next)
      onChange?.(next)
    } else {
      const next = Object.fromEntries(ZODIACS.map((zodiac) => [zodiac.sign, { ...source }]))
      setTemplates(next)
      onChange?.(next)
    }
    setNotice(`${activeKey} copied to all ${isVedicMode ? 'specializations' : 'signs'}`)
  }

  const reset = () => {
    const restored = initialFor(activeKey, initialTemplates, activeDefaults)
    if (isVedicMode) {
      setSpecializationTemplates((prev) => {
        const next = { ...prev, [activeKey]: restored }
        onChange?.(next)
        return next
      })
    } else {
      setTemplates((prev) => {
        const next = { ...prev, [activeKey]: restored }
        onChange?.(next)
        return next
      })
    }
    setNotice(`${activeKey} reset`)
  }

  const visibleZodiacs = ZODIACS.filter((zodiac) => elementFilter === 'All' || zodiac.element === elementFilter)

  return (
    <section className="zte">
      <header className="zte-header"><h2 className="zte-title">Follower Perks &amp; Benefits</h2><p className="zte-sub">Create personalized guidance for zodiac signs and Jyotish Panchangam events.</p></header>

      <div className="zte-mode-toggle" role="tablist" aria-label="Template type">
        {MODES.map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} className={`zte-mode${mode === item ? ' zte-mode-active' : ''}`} onClick={() => { setMode(item); setNotice(null) }}>{item}</button>)}
      </div>

      {!isVedicMode ? <>
        <div className="zte-section-heading"><span>1</span><div><h3>Zodiac Signs</h3><p>12 Rasis</p></div></div>
        <div className="zte-filter-row" aria-label="Filter zodiac signs by element"><span className="zte-filter-label">Element</span><div className="zte-filters">{ELEMENTS.map((element) => <button key={element} type="button" className={`zte-filter${elementFilter === element ? ' zte-filter-active' : ''}`} onClick={() => setElementFilter(element)}>{element}</button>)}</div></div>
        <div className="zte-grid" role="listbox" aria-label="Zodiac signs">
          {visibleZodiacs.map((zodiac) => { const isSelected = zodiac.sign === selected; return <button key={zodiac.sign} type="button" role="option" aria-selected={isSelected} className={`zte-sign${isSelected ? ' zte-sign-selected' : ''}`} onClick={() => setSelected(zodiac.sign)}><span className="zte-symbol" aria-hidden="true">{zodiac.symbol}</span><span className="zte-name">{zodiac.en}</span><span className="zte-element">{zodiac.element}</span>{isSelected && <Check className="zte-check" size={14} aria-hidden="true" />}</button> })}
        </div>
      </> : <>
        <div className="zte-section-heading"><span>2</span><div><h3>Specializations</h3><p>Hindu Astrological Events and Rituals · Jyotish Panchangam</p></div></div>
        <div className="zte-special-grid" role="listbox" aria-label="Hindu astrological events and rituals">
          {SPECIALIZATIONS.map((item) => <button key={item.name} type="button" role="option" aria-selected={item.name === selectedSpecialization} className={`zte-special-card${item.name === selectedSpecialization ? ' zte-sign-selected' : ''}`} onClick={() => setSelectedSpecialization(item.name)}><span className="zte-special-icon" aria-hidden="true">ॐ</span><strong>{item.name}</strong><span>{item.category}</span>{item.name === selectedSpecialization && <Check className="zte-check" size={14} aria-hidden="true" />}</button>)}
        </div>
      </>}

      <div className="zte-workspace">
        <div className="zte-panel">
          <div className="zte-panel-head"><div><span className="zte-selected-label">{isVedicMode ? activeItem?.name : `${activeItem?.symbol} ${activeItem?.en}`}</span><span className="zte-sign-meta">{isVedicMode ? `${activeItem?.category} · Auspicious: ${activeItem?.day}` : `${activeItem?.dates} · ${activeItem?.element}`}</span></div><span className="zte-ruler">{isVedicMode ? `${activeItem?.planet} · ${activeItem?.deity}` : `Ruled by ${activeItem?.ruler}`}</span></div>
          {isVedicMode && <div className="zte-vedic-meta"><span>Deity: {activeItem?.deity}</span><span>Planet: {activeItem?.planet}</span><span>Kshetra: {activeItem?.temple}</span></div>}
          <div className="zte-tabs" role="tablist" aria-label={isVedicMode ? 'Specialization template' : 'Template period'}>{(isVedicMode ? SPECIALIZATION_TABS : PERIODS).map((item) => { const active = activePeriod === item; return <button key={item} type="button" role="tab" aria-selected={active} className={`zte-tab${active ? ' zte-tab-active' : ''}`} onClick={() => isVedicMode ? setSpecializationTab(item) : setPeriod(item)}>{item}</button> })}</div>
          <label className="zte-field"><span className="zte-field-label">{activePeriod}</span><textarea className="zte-textarea" value={previewText} onChange={(e) => update(activeKey, activePeriod, e.target.value)} placeholder={activeDefaults[activePeriod]} rows={7} /></label>
          <div className="zte-inspiration"><span className="zte-field-label">{isVedicMode ? 'Add Vedic inspiration' : 'Add inspiration'}</span><div className="zte-chips">{(isVedicMode ? VEDIC_CHIPS : INSPIRATION_CHIPS).map((chip) => <button key={chip} type="button" className="zte-chip" onClick={() => appendInspiration(chip)}>+ {chip}</button>)}</div></div>
          <div className="zte-actions"><button type="button" className="zte-save" onClick={save}><Save size={15} aria-hidden="true" /> Save</button><button type="button" className="zte-secondary" onClick={copyToAll}><Copy size={15} aria-hidden="true" /> Copy to All {isVedicMode ? 'Specializations' : 'Signs'}</button><button type="button" className="zte-secondary" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Reset</button>{notice && <span className="zte-saved" role="status">{notice}</span>}</div>
        </div>

        <aside className={`zte-preview${isVedicMode ? ' zte-preview-vedic' : ''}`} aria-label="Live follower preview"><div className="zte-preview-heading"><span>Live Follower Preview</span><span className="zte-live-dot">● Live</span></div><div className="zte-profile"><div className="zte-avatar" aria-hidden="true">DR</div><div><strong>Dr. Rani</strong><span>{isVedicMode ? 'Jyotish Panchangam guidance' : `Guidance for ${activeItem?.en}`}</span></div><span className="zte-preview-symbol" aria-hidden="true">{isVedicMode ? 'ॐ' : activeItem?.symbol}</span></div>{isVedicMode ? <><div className="zte-blessing">🙏 Blessings of {activeItem?.deity}</div><div className="zte-temple-pill">⌾ {activeItem?.temple}</div></> : <div className="zte-preview-period">{activePeriod} insight</div>}<p className="zte-preview-text">{previewText || 'Your personalized guidance will appear here.'}</p>{isVedicMode ? <div className="zte-lucky-pills"><span>✦ {activeItem?.planet}</span><span>☀ {activeItem?.day}</span></div> : <div className="zte-lucky-pills"><span>✦ {activeItem?.luckyColor}</span><span>♧ Lucky {activeItem?.luckyNumber}</span></div>}</aside>
      </div>
    </section>
  )
}
