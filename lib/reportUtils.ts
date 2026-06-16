import { parseDate } from './parseSheet'

/**
 * Returns the Monday and Sunday of the most recently completed Mon–Sun week.
 */
export function getLastWeek(): { monday: Date; sunday: Date } {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const thisMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
  ))

  const monday = new Date(thisMonday)
  monday.setUTCDate(thisMonday.getUTCDate() - 7)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  return { monday, sunday }
}

/**
 * Converts any supported date string to MM/DD/YYYY.
 */
export function normalizeDate(str: string): string {
  const datePart = str.split(' ')[0]
  const d = parseDate(datePart)
  if (!d) return str
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const y = d.getUTCFullYear()
  return `${m}/${day}/${y}`
}

/**
 * Splits "YYYY-MM-DD HH:mm:ss" into { date: "M/D/YYYY", time: "HH:mm:ss" }.
 */
export function splitDateTime(str: string): { date: string; time: string } {
  const spaceIdx = str.indexOf(' ')
  const datePart = spaceIdx >= 0 ? str.slice(0, spaceIdx) : str
  const timePart = spaceIdx >= 0 ? str.slice(spaceIdx + 1) : ''
  return { date: normalizeDate(datePart), time: timePart }
}

/**
 * Converts a guide time string "H:MM:SS AM/PM" to a 24-hour integer hour.
 * Returns -1 if unparseable.
 */
export function guideTimeTo24Hour(timeStr: string): number {
  if (!timeStr) return -1
  const parts = timeStr.trim().split(/[\s:]+/)
  if (parts.length < 3) return -1
  const hour = parseInt(parts[0], 10)
  const period = parts[parts.length - 1].toUpperCase()
  if (isNaN(hour)) return -1
  if (period === 'AM') return hour === 12 ? 0 : hour
  if (period === 'PM') return hour === 12 ? 12 : hour + 12
  return hour
}

/**
 * Returns true if a guide time string represents an AM-period tour.
 * AM: time marker is AM, or 12:XX PM (noon).
 */
export function isGuideAMPeriod(timeStr: string): boolean {
  const upper = timeStr.toUpperCase().trim()
  if (upper.includes('AM')) return true
  if (upper.includes('PM')) {
    const hour = parseInt(timeStr.trim().split(':')[0], 10)
    return hour === 12 // 12 PM (noon) counts as AM period
  }
  return false
}

/**
 * Returns the hour (0-23) from a booking start_date "YYYY-MM-DD HH:mm:ss".
 */
export function bookingStartHour(startDate: string): number {
  const spaceIdx = startDate.indexOf(' ')
  if (spaceIdx < 0) return -1
  const timePart = startDate.slice(spaceIdx + 1)
  return parseInt(timePart.split(':')[0], 10)
}

/**
 * Formats a Date to YYYY-MM-DD.
 */
export function toYMD(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Checks whether a google_ads record matches the given tour/city combination.
 */
export function adMatchesTour(
  ad: { name: string },
  tourName: string,
  city: string,
): boolean {
  const adName = (ad.name ?? '').toLowerCase()
  const tour = tourName.toLowerCase()
  const c = city.toLowerCase()

  if (tour.includes('sachsenhausen')) {
    return adName.includes('sachsenhausen')
  }
  if (tour.includes('alternative')) {
    return adName.includes('alternative')
  }
  if (tour.includes('beer') || (tour.includes('food') && tour.includes('berlin'))) {
    return (adName.includes('beer') && (adName.includes('food') || adName.includes('garden'))) ||
           (adName.includes('food') && adName.includes('beer'))
  }
  if (tour.includes('walking tour') || tour === 'walking tour') {
    return adName.includes('walking tour') || adName.includes('free walking')
  }
  if (tour.includes('pub crawl') || tour.includes('crawl')) {
    return adName.includes('pub crawl') && adName.includes(c.split(' ')[0])
  }
  return false
}
