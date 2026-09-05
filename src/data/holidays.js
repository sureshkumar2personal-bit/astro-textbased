// National public holidays shown in appointment availability.  Keeping this
// small local catalogue makes the behaviour deterministic and easy to extend
// without making scheduling depend on an external service.
export const GOVERNMENT_HOLIDAYS = {
  '2026-01-26': 'Republic Day',
  '2026-03-04': 'Holi',
  '2026-08-15': 'Independence Day',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-08': 'Diwali',
  '2026-12-25': 'Christmas Day',
}

export function getGovernmentHoliday(dateIso) {
  const name = GOVERNMENT_HOLIDAYS[dateIso]
  return name ? { name, type: 'Government Holiday' } : null
}
