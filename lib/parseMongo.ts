import clientPromise from '@/lib/mongodb'
import { parseDate, TourRow } from '@/lib/parseSheet'

export const MONGO_CITY_MAP: Record<string, { city: string; tour: string }> = {
  'Budapest Pub Crawl': { city: 'Budapest', tour: 'Pub Crawl' },
  'Stockholm Uppsala Tour': { city: 'Stockholm', tour: 'Uppsala Tour' },
}

export function isMongoCity(city: string): boolean {
  return city in MONGO_CITY_MAP
}

type MongoGuideDocument = {
  Timestamp?: string | Date
  tour?: string
  main_guide?: string
  main_guide_payment?: number
  manager?: string
  date?: string
  time?: string
  participants?: number
  canceled?: string
  did_guide_show_up?: string
  cash_guests?: number
  expenses?: number
  second_guide_name?: string
  second_guide_payment?: number
  third_guide_name?: string
  third_guide_payment?: number
  fourth_guide_name?: string
  fourth_guide_payment?: number
  fifth_guide_name?: string
  fifth_guide_payment?: number
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function formatDateMMDDYYYY(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = String(date.getUTCFullYear())
  return `${month}/${day}/${year}`
}

function buildDateRange(startDate: Date, endDate: Date): string[] {
  const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()))

  const dates: string[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(formatDateMMDDYYYY(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export async function fetchAndParseMongoData(
  cityKey: string,
  startDate: Date,
  endDate: Date
): Promise<TourRow[]> {
  if (!process.env.MONGODB_URI || !clientPromise) {
    throw new Error('MONGODB_URI is not set. Please configure it in your environment.')
  }

  const cityFilter = MONGO_CITY_MAP[cityKey]
  if (!cityFilter) {
    return []
  }

  const client = await clientPromise
  const db = client.db('test')
  const collection = db.collection<MongoGuideDocument>('Guides')
  const dateRange = buildDateRange(startDate, endDate)

  const docs = await collection
    .find({
      city: cityFilter.city,
      tour: cityFilter.tour,
      date: { $in: dateRange },
    })
    .toArray()

  const rows: TourRow[] = docs.map((doc) => {
    const mainGuidePayment = toNumber(doc.main_guide_payment)
    const secondGuidePayment = toNumber(doc.second_guide_payment)
    const thirdGuidePayment = toNumber(doc.third_guide_payment)
    const fourthGuidePayment = toNumber(doc.fourth_guide_payment)
    const fifthGuidePayment = toNumber(doc.fifth_guide_payment)
    const dailyExpenses = toNumber(doc.expenses)

    const totalPayout =
      mainGuidePayment +
      secondGuidePayment +
      thirdGuidePayment +
      fourthGuidePayment +
      fifthGuidePayment

    const totalCost = totalPayout + dailyExpenses

    return {
      timestamp: doc.Timestamp ? new Date(doc.Timestamp).toISOString() : '',
      tourName: doc.tour ?? '',
      mainGuideName: doc.main_guide ?? '',
      mainGuidePayment,
      mpmName: doc.manager ?? '',
      tourDate: doc.date ?? '',
      tourTime: doc.time ?? '',
      numberOfGuests: toNumber(doc.participants),
      wasCancelled: doc.canceled ?? '',
      didGuideShowUp: doc.did_guide_show_up ?? '',
      numberOfCashGuests: toNumber(doc.cash_guests),
      dailyExpenses,
      secondGuideName: doc.second_guide_name ?? '',
      secondGuidePayment,
      thirdGuideName: doc.third_guide_name ?? '',
      thirdGuidePayment,
      fourthGuideName: doc.fourth_guide_name ?? '',
      fourthGuidePayment,
      fifthGuideName: doc.fifth_guide_name ?? '',
      fifthGuidePayment,
      totalPayout,
      totalCost,
    }
  })

  rows.sort((a, b) => {
    const da = parseDate(a.tourDate)
    const db = parseDate(b.tourDate)
    if (!da || !db) return 0
    const diff = da.getTime() - db.getTime()
    if (diff !== 0) return diff

    const ta = new Date(`1970-01-01 ${a.tourTime}`).getTime()
    const tb = new Date(`1970-01-01 ${b.tourTime}`).getTime()
    if (Number.isNaN(ta) || Number.isNaN(tb)) return a.tourTime.localeCompare(b.tourTime)
    return ta - tb
  })

  return rows
}
