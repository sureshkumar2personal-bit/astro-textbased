const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

export function parseDisplayDate(value) {
  if (!value) return new Date(0)

  if (value instanceof Date) return value

  const normalized = String(value).trim()
  const isoLike = Date.parse(normalized)
  if (!Number.isNaN(isoLike)) {
    return new Date(isoLike)
  }

  const parts = normalized.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?$/)
  if (!parts) return new Date(0)

  const [, day, monthName, year, hourRaw = '0', minuteRaw = '0', meridiem = 'AM'] = parts
  const month = MONTHS[monthName.toLowerCase()]
  if (month == null) return new Date(0)

  let hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12
  if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0

  return new Date(Number(year), month, Number(day), hour, minute)
}

export function sortByDateDesc(a, b, getter) {
  return parseDisplayDate(getter(b)).getTime() - parseDisplayDate(getter(a)).getTime()
}

export function getPaymentHoldStatus(dateValue, holdDays = 7, referenceDate = new Date()) {
  const transactionDate = parseDisplayDate(dateValue)
  const releaseDate = new Date(transactionDate.getTime() + holdDays * 24 * 60 * 60 * 1000)
  const msRemaining = releaseDate.getTime() - referenceDate.getTime()
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)))

  return {
    held: msRemaining > 0,
    releaseDate,
    daysRemaining,
  }
}
