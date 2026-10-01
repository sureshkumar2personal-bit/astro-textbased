import { useState } from 'react'
import { X } from 'lucide-react'
import SavedAtonementDetails from './SavedAtonementDetails.jsx'

// The "Saved Atonement Content" modal (checkbox list, View preview, Attach Selected) — shared by the
// call-end consultation and the astrologer question answer so both behave identically.
export default function SavedAtonementPicker({ items, onClose, onAttach }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [preview, setPreview] = useState(null)
  const toggle = (id) => setSelectedIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]))

  return (
    <>
      <div className="apt-saved-content-backdrop" role="dialog" aria-modal="true" aria-labelledby="saved-content-title" onClick={onClose}>
        <div className="apt-saved-content-modal" onClick={(event) => event.stopPropagation()}>
          <div className="apt-saved-content-head"><div><h3 id="saved-content-title">Saved Atonement Content</h3><p>Select one or more saved items to attach.</p></div><button type="button" className="icon-btn" aria-label="Close saved content" onClick={onClose}><X size={16} /></button></div>
          <div className="apt-saved-content-list">
            {items.length ? items.map((item) => <label className="apt-saved-content-item" key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} /><span className="apt-saved-content-type">{item.type}</span><span><strong>{item.name}</strong><small>{item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Saved content'}</small></span><button type="button" className="apt-saved-view" onClick={(event) => { event.preventDefault(); setPreview(item) }}>View</button></label>) : <div className="apt-saved-content-empty">No saved Atonement content yet.</div>}
          </div>
          <div className="apt-saved-content-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={!selectedIds.length} onClick={() => onAttach(items.filter((item) => selectedIds.includes(item.id)))}>Attach Selected</button></div>
        </div>
      </div>
      {preview && <SavedAtonementDetails name={preview.name} content={preview.content} preview={preview.preview} onClose={() => setPreview(null)} onAttach={() => { setSelectedIds((ids) => (ids.includes(preview.id) ? ids : [...ids, preview.id])); setPreview(null) }} />}
    </>
  )
}
