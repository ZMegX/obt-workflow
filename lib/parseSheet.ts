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
 * Parse a date string that may be in multiple formats:
 * - M/D/YYYY HH:mm:ss  (Google Sheets timestamp — most common)
 * - M/D/YYYY
 * - DD/MM/YYYY
 * - YYYY-MM-DD
 * Returns a Date object at midnight UTC for comparison.
 */
export function parseDate(raw: string): Date | null {
  if (!raw || raw.trim() === '') return null

  const trimmed = raw.trim()

  // Strip time portion if present (e.g. "6/5/2026 10:30:00 PM" → "6/5/2026")
  const dateOnly = trimmed.split(' ')[0]

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [y, m, d] = dateOnly.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    if (!isNaN(date.getTime())) return date
  }

  // Slash-separated: M/D/YYYY or DD/MM/YYYY
  const slashParts = dateOnly.split('/')
  if (slashParts.length === 3) {
    const [a, b, c] = slashParts.map((p) => parseInt(p, 10))

    // If c > 31 it's the year → format is M/D/YYYY or D/M/YYYY
    if (c > 31) {
      if (a > 12) {
        // D/M/YYYY
        const date = new Date(Date.UTC(c, b - 1, a))
        if (!isNaN(date.getTime())) return date
      } else {
        // M/D/YYYY (US format — Google Sheets default)
        const date = new Date(Date.UTC(c, a - 1, b))
        if (!isNaN(date.getTime())) return date
      }
    }
  }

  // Fallback: native parsing
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
    // Column F (index 5) = Tour Date
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

export const SHEET_IDS: Record<string, { id: string; sheetName: string }> = {
  'Amsterdam':                    { id: '1ez3nDHt2GIoF5Uqq2sQi-NKj8Bfi1Z47-TawiPqq0-g', sheetName: 'Form Responses 1' },
  'Athens':                       { id: '1J2SJZQ7K7_IkbdNyeSJ8TSuXUOxipZGrAZEnvaOk85Q', sheetName: 'Form Responses 1' },
  'Barcelona Alternative':        { id: '1AtvFGE85Gt5yJnLW8hbDvjYeui3NwqLlpEH7isPKTJQ', sheetName: 'Form Responses 1' },
  'Barcelona Pub Crawl':          { id: '1Krle486ytkBNGJLIfHbyg-xFHGOxcEt4M61xcN5rXng', sheetName: 'Form Responses 1' },
  'Berlin Alternative Pub Crawl': { id: '1qLi5dv77BXJu4KGZ27ypZTUzSXFnmbJ2gO-BP4vSoKI', sheetName: 'Form Responses 1' },
  'Berlin Alternative Tour':      { id: '1kVjDJpenkcVvw6c-rWqnWS4HfEnFAK3jtbun-ED8gDo', sheetName: 'Form Responses 1' },
  'Berlin Free Walking Tour':     { id: '1ELiVdTEhxwwtIf_KxLjqz1MisW5C-W8VI-2zq7_j5Oo', sheetName: 'Form Responses 1' },
  'Berlin Potsdam Tour':          { id: '1Z5paateflvkXcvIm9d-qxAYPCQJJxQK6sJNK1_s3uRU', sheetName: 'Form Responses 1' },
  'Berlin Pub Crawl':             { id: '1ALQmNhJ4j4Y4HL8_1xyd-gelD5t3XXVpj7qhCRZcGcY', sheetName: 'Form Responses 1' },
  'Budapest Pub Crawl':           { id: '1ivH1be9rhCmbRXt7P3gBK6OuS4kMjId9WbBmsK2e2kk', sheetName: 'Form Responses 1' },
  'Hamburg Daily Pub Crawl':      { id: '1xmUwrWMfIIkSu-YBP68zfmte_V34Bhq_FWcmcbjhnwQ', sheetName: 'Form Responses 1' },
  'Paris':                        { id: '1YFiZwjtu2qwFS9rCc9Nnf0YYI40AtVBa4Z6CLxXv5I4', sheetName: 'Form Responses 1' },
  'Stockholm':                    { id: '1wzw380UrmCXH03jVw1_PnvzIhZ0t_MMcxefP6qx4pr4', sheetName: 'Form Responses 1' },
  'Warsaw':                       { id: '1fOmbxVRlsYHEA1wUqoA1Vus46e9OfibGCrV1Lz5CSY8', sheetName: 'Form Responses 1' },
}

export function getSheetConfig(city: string) {
  return SHEET_IDS[city] ?? null
}

export function getCityList(): string[] {
  return Object.keys(SHEET_IDS)
}
