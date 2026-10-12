import { useRef, useState } from 'react'
import { UploadCloud, CheckCircle2 } from 'lucide-react'

// The app's single upload primitive. It has always been fire-and-forget (it only
// shows the picked file name), so `onFileSelect` is optional: callers that do not
// pass it keep the previous behaviour exactly.
export default function UploadField({ label, accept, onFileSelect, fileName: controlledFileName, hint }) {
  const inputRef = useRef(null)
  const [internalFileName, setInternalFileName] = useState('')
  const fileName = controlledFileName ?? internalFileName

  const handleChange = (event) => {
    const file = event.target.files?.[0] || null
    // Clearing the value lets the same file be picked again after a removal.
    event.target.value = ''
    setInternalFileName(file?.name || '')
    onFileSelect?.(file)
  }

  return (
    <div>
      <div
        className="cursor-pointer rounded-[18px] border-2 border-dashed border-[color:var(--violet-200)] bg-[linear-gradient(180deg,rgba(244,239,255,0.95),rgba(255,255,255,0.9))] px-6 py-7 text-center text-sm font-semibold text-[color:var(--violet-700)] shadow-[0_1px_2px_rgba(27,20,54,0.06),0_8px_18px_rgba(91,57,192,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--violet-500)] hover:bg-[color:var(--violet-100)] hover:shadow-[0_8px_24px_rgba(76,29,149,0.11)]"
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <UploadCloud size={26} />
        <div className="mt-2">{label}</div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
      {fileName && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-[color:var(--green-600)]">
          <CheckCircle2 size={15} />
          {fileName}
        </div>
      )}
      {hint && <div className="muted mt-2 text-xs">{hint}</div>}
    </div>
  )
}