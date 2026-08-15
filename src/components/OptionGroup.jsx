export function RadioGroup({ options, value, onChange, name }) {
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((opt) => {
        const selected = value === opt
        return (
          <label
            key={opt}
            className={[
              'flex cursor-pointer items-center gap-3 rounded-[12px] border border-[color:var(--line)] bg-white/90 px-4 py-3 text-sm font-medium text-[color:var(--body)] shadow-[0_1px_2px_rgba(27,20,54,0.06),0_8px_18px_rgba(91,57,192,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--violet-300)] hover:bg-[color:var(--violet-50)]',
              selected ? 'border-[color:var(--violet-500)] bg-[color:var(--violet-50)] font-bold text-[color:var(--violet-700)]' : '',
            ].join(' ')}
          >
            <input type="radio" name={name} checked={selected} onChange={() => onChange(opt)} className="sr-only" />
            <span
              className={[
                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-[color:var(--line)] transition duration-200',
                selected ? 'border-[color:var(--violet-600)] bg-[color:var(--violet-600)] text-white' : '',
              ].join(' ')}
            >
              {selected && '●'}
            </span>
            {opt}
          </label>
        )
      })}
    </div>
  )
}

export function CheckGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((opt) => {
        const selected = value === opt
        return (
          <label
            key={opt}
            className={[
              'flex cursor-pointer items-center gap-3 rounded-[12px] border border-[color:var(--line)] bg-white/90 px-4 py-3 text-sm font-medium text-[color:var(--body)] shadow-[0_1px_2px_rgba(27,20,54,0.06),0_8px_18px_rgba(91,57,192,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--violet-300)] hover:bg-[color:var(--violet-50)]',
              selected ? 'border-[color:var(--violet-500)] bg-[color:var(--violet-50)] font-bold text-[color:var(--violet-700)]' : '',
            ].join(' ')}
          >
            <input type="checkbox" checked={selected} onChange={() => onChange(opt)} className="sr-only" />
            <span
              className={[
                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 border-[color:var(--line)] transition duration-200',
                selected ? 'border-[color:var(--violet-600)] bg-[color:var(--violet-600)] text-white' : '',
              ].join(' ')}
            >
              {selected && '✓'}
            </span>
            {opt}
          </label>
        )
      })}
    </div>
  )
}

export function ChipGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={[
            'rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-[13px] font-semibold text-[color:var(--body)] shadow-[0_1px_2px_rgba(27,20,54,0.06),0_8px_18px_rgba(91,57,192,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--violet-300)]',
            value === opt ? 'border-transparent bg-[linear-gradient(135deg,var(--violet-500),var(--coral-500))] text-white shadow-[0_10px_20px_rgba(143,77,255,0.22)]' : '',
          ].join(' ')}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
