export default function FilterBar({
  search,
  onSearchChange,
  specialization,
  onSpecializationChange,
  minRating,
  onMinRatingChange,
  priceBand,
  onPriceBandChange,
  availability,
  onAvailabilityChange,
  specializations = [],
  priceOptions = [],
  availabilityOptions = [],
  className = '',
}) {
  return (
    <div className={`grid gap-4 rounded-[24px] border border-[color:var(--surface-border)] bg-white/90 p-4 shadow-[0_8px_22px_rgba(15,23,42,0.05)] backdrop-blur ${className}`.trim()}>
      <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
        <label className="grid gap-2">
          <span className="field-label-top">Search</span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search astrologers"
            className="text-input"
          />
        </label>
        <label className="grid gap-2">
          <span className="field-label-top">Specialization</span>
          <select className="select-input" value={specialization} onChange={(event) => onSpecializationChange(event.target.value)}>
            <option value="">All</option>
            {specializations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label-top">Min Rating</span>
          <select className="select-input" value={minRating} onChange={(event) => onMinRatingChange(event.target.value)}>
            <option value="">Any</option>
            {['4.0', '4.5', '4.7', '4.8', '4.9'].map((item) => <option key={item} value={item}>{item}+</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label-top">Price</span>
          <select className="select-input" value={priceBand} onChange={(event) => onPriceBandChange(event.target.value)}>
            <option value="">Any</option>
            {priceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label-top">Availability</span>
          <select className="select-input" value={availability} onChange={(event) => onAvailabilityChange(event.target.value)}>
            {availabilityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  )
}

