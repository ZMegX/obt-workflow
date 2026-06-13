import Papa from 'papaparse'

export interface TourRow {
  timestamp: string
  tourName: string
  mainGuideName: string
  mainGuidePayment: number
  mpmName: string
  tourDate: string
  tourTime: string
  numberOfGuests: number
  wasCancelled: string
  didGuideShowUp: string
  numberOfCashGuests: number
  dailyExpenses: number
  secondGuideName: string
  secondGuidePayment: number
  thirdGuideName: string
  thirdGuidePayment: number
  fourthGuideName: string
  fourthGuidePayment: number
  fifthGuideName: string
  fifthGuidePayment: number
  totalPayout: number
  totalCost: number
}

/**
 * Parse a date string that may be in DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD format.
 * Returns a Date object at midnight UTC for comparison.
 */
function parseDate(raw: string): Date | null {
  if (!raw || raw.trim() === '') return null

  const trimmed = raw.trim()

  // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed.substring(0, 10))
    if (!isNaN(d.getTime())) return d
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const slashParts = trimmed.split('/')
  if (slashParts.length === 3) {
    const [a, b, c] = slashParts.map((p) => parseInt(p, 10))
    // If first part > 12, it must be DD/MM/YYYY
    if (a > 12) {
      const d = new Date(Date.UTC(c, b - 1, a))
      if (!isNaN(d.getTime())) return d
    }
    // Otherwise assume DD/MM/YYYY (European convention used in this context)
    const d = new Date(Date.UTC(c, b - 1, a))
    if (!isNaN(d.getTime())) return d
  }

  // Try native parsing as fallback
  const fallback = new Date(trimmed)
  if (!isNaN(fallback.getTime())) return fallback

  return null
}

function parseNumber(raw: string | undefined): number {
  if (!raw || raw.trim() === '') return 0
  const n = parseFloat(raw.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

/**
 * Fetch the public CSV from Google Sheets and return parsed, filtered rows.
 */
export async function fetchAndParseSheet(
  sheetId: string,
  sheetName: string,
  startDate: Date,
  endDate: Date
): Promise<TourRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`)
  }
  const csvText = await response.text()

  const { data } = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  })

  // First row is the header — skip it
  const rows = data.slice(1)

  const result: TourRow[] = []

  // Normalise comparison dates to midnight UTC
  const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()))

  for (const row of rows) {
    const tourDateRaw = row[5] ?? ''
    const tourDate = parseDate(tourDateRaw)
    if (!tourDate) continue

    // Normalise to midnight UTC for comparison
    const tourDateMidnight = new Date(Date.UTC(tourDate.getUTCFullYear(), tourDate.getUTCMonth(), tourDate.getUTCDate()))

    if (tourDateMidnight < start || tourDateMidnight > end) continue

    const mainGuidePayment = parseNumber(row[3])
    const secondGuidePayment = parseNumber(row[13])
    const thirdGuidePayment = parseNumber(row[15])
    const fourthGuidePayment = parseNumber(row[17])
    const fifthGuidePayment = parseNumber(row[19])
    const dailyExpenses = parseNumber(row[11])

    const totalPayout =
      mainGuidePayment +
      secondGuidePayment +
      thirdGuidePayment +
      fourthGuidePayment +
      fifthGuidePayment

    const totalCost = totalPayout + dailyExpenses

    result.push({
      timestamp: row[0] ?? '',
      tourName: row[1] ?? '',
      mainGuideName: row[2] ?? '',
      mainGuidePayment,
      mpmName: row[4] ?? '',
      tourDate: tourDateRaw,
      tourTime: row[6] ?? '',
      numberOfGuests: parseNumber(row[7]),
      wasCancelled: row[8] ?? '',
      didGuideShowUp: row[9] ?? '',
      numberOfCashGuests: parseNumber(row[10]),
      dailyExpenses,
      secondGuideName: row[12] ?? '',
      secondGuidePayment,
      thirdGuideName: row[14] ?? '',
      thirdGuidePayment,
      fourthGuideName: row[16] ?? '',
      fourthGuidePayment,
      fifthGuideName: row[18] ?? '',
      fifthGuidePayment,
      totalPayout,
      totalCost,
    })
  }

  // Sort by tour date then time
  result.sort((a, b) => {
    const da = parseDate(a.tourDate)
    const db = parseDate(b.tourDate)
    if (!da || !db) return 0
    const diff = da.getTime() - db.getTime()
    if (diff !== 0) return diff
    return a.tourTime.localeCompare(b.tourTime)
  })

  return result
}

const SHEET_IDS: Record<string, { id: string; sheetName: string }> = {
  Amsterdam: {
    id: '1ez3nDHt2GIoF5Uqq2sQi-NKj8Bfi1Z47-TawiPqq0-g',
    sheetName: 'Form Responses 1',
  },
}

export function getSheetConfig(city: string) {
  return SHEET_IDS[city] ?? null
}
