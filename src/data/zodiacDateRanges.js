// Shared tropical zodiac date ranges used wherever a sign's calendar range is shown.
export const ZODIAC_DATE_RANGES = Object.freeze({
  Aries: 'Mar 21 - Apr 19',
  Taurus: 'Apr 20 - May 20',
  Gemini: 'May 21 - Jun 20',
  Cancer: 'Jun 21 - Jul 22',
  Leo: 'Jul 23 - Aug 22',
  Virgo: 'Aug 23 - Sep 22',
  Libra: 'Sep 23 - Oct 22',
  Scorpio: 'Oct 23 - Nov 21',
  Sagittarius: 'Nov 22 - Dec 21',
  Capricorn: 'Dec 22 - Jan 19',
  Aquarius: 'Jan 20 - Feb 18',
  Pisces: 'Feb 19 - Mar 20',
})

export function getZodiacDateRange(sign) {
  return ZODIAC_DATE_RANGES[sign] || ''
}
