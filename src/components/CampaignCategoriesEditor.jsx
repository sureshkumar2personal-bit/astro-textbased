import { createBlankCategory } from '../utils/campaignCategories.js'

export function CampaignCategoriesEditor({ categories, onChange }) {
  const update = (index, patch) => onChange(categories.map((cat, i) => (i === index ? { ...cat, ...patch } : cat)))
  const addCategory = () => {
    if (categories.length < 6) onChange([...categories, createBlankCategory()])
  }
  const removeCategory = (index) => {
    if (categories.length > 4) onChange(categories.filter((_, i) => i !== index))
  }
  const compulsoryTotal = categories.reduce((sum, cat) => sum + (Number(cat.compulsoryQuestions) || 0), 0)
  const countValid = categories.length >= 4 && categories.length <= 6
  const compulsoryValid = compulsoryTotal === 600
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {categories.map((cat, index) => (
        <div
          key={index}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) repeat(3, 110px) 36px', gap: 10, alignItems: 'end' }}
        >
          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Category</span>
            <input
              className="text-input"
              value={cat.name}
              placeholder="e.g. Marriage"
              onChange={(e) => update(index, { name: e.target.value })}
            />
          </label>
          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Normal ₹</span>
            <input
              type="number"
              className="text-input"
              min={0}
              value={cat.normalPrice}
              onChange={(e) => update(index, { normalPrice: Number(e.target.value) })}
            />
          </label>
          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Discount %</span>
            <input
              type="number"
              className="text-input"
              min={0}
              max={100}
              value={cat.discountPercent}
              onChange={(e) => update(index, { discountPercent: Number(e.target.value) })}
            />
          </label>
          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Compulsory</span>
            <input
              type="number"
              className="text-input"
              min={0}
              value={cat.compulsoryQuestions}
              onChange={(e) => update(index, { compulsoryQuestions: Number(e.target.value) })}
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 38, padding: '0 8px' }}
            onClick={() => removeCategory(index)}
            disabled={categories.length <= 4}
            title="Remove category"
          >
            ✕
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline" onClick={addCategory} disabled={categories.length >= 6}>
          + Add Category
        </button>
        <span className="muted" style={{ fontSize: 13 }}>
          Categories: {categories.length}/6 · Compulsory total: <strong>{compulsoryTotal}</strong>/600
          {!countValid && ' (need 4–6)'}
          {countValid && !compulsoryValid && ' (must equal 600)'}
          {countValid && compulsoryValid && ' ✓'}
        </span>
      </div>
    </div>
  )
}
