import getClientPromise from '@/lib/mongodb'
import { TourRow, parseDate } from '@/lib/parseSheet'

export const MONGO_CITY_MAP: Record<string, { city: string; tour: string }> = {
  'Budapest Pub Crawl':     { city: 'Budapest', tour: 'Pub Crawl' },
  'Stockholm Uppsala Tour': { city: 'Stockholm', tour: 'Uppsala Tour' },
  'Berlin Beer Food':       { city: 'Berlin Beer Food', tour: 'Berlin Beer Food' },
}

export function isMongoCity(city: string): boolean {
  return city in MONGO_CITY_MAP
}

export async function fetchAndParseMongoData(
  cityKey: string,
  startDate: Date,
  endDate: Date
): Promise<TourRow[]> {
  const filter = MONGO_CITY_MAP[cityKey]
  if (!filter) {
    throw new Error(`Unknown MongoDB city: ${cityKey}`)
  }

  const client = await getClientPromise()
  const db = client.db('test')
  const collection = db.collection('Guides')

  const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()))

  const docs = await collection.find({ city: filter.city, tour: filter.tour }).toArray()

  const result: TourRow[] = []

  for (const doc of docs) {
    const tourDate = parseDate(doc.date ?? '')
    if (!tourDate) continue

    const tourDateMidnight = new Date(Date.UTC(tourDate.getUTCFullYear(), tourDate.getUTCMonth(), tourDate.getUTCDate()))
    if (tourDateMidnight < start || tourDateMidnight > end) continue

    const mainGuidePayment = Number(doc.main_guide_payment) || 0
    const secondGuidePayment = Number(doc.second_guide_payment) || 0
    const thirdGuidePayment = Number(doc.third_guide_payment) || 0
    const fourthGuidePayment = Number(doc.fourth_guide_payment) || 0
    const fifthGuidePayment = Number(doc.fifth_guide_payment) || 0
    const dailyExpenses = Number(doc.expenses) || 0

    const totalPayout =
      mainGuidePayment +
      secondGuidePayment +
      thirdGuidePayment +
      fourthGuidePayment +
      fifthGuidePayment

    const totalCost = totalPayout + dailyExpenses

    result.push({
      timestamp: doc.Timestamp ? new Date(doc.Timestamp).toISOString() : '',
      tourName: doc.tour ?? '',
      mainGuideName: doc.main_guide ?? '',
      mainGuidePayment,
      mpmName: doc.manager ?? '',
      tourDate: doc.date ?? '',
      tourTime: doc.time ?? '',
      numberOfGuests: Number(doc.participants) || 0,
      wasCancelled: doc.canceled ?? 'No',
      didGuideShowUp: doc.did_guide_show_up ?? 'Yes',
      numberOfCashGuests: Number(doc.cash_guests) || 0,
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
    })
  }

  result.sort((a, b) => {
    const da = parseDate(a.tourDate)
    const db2 = parseDate(b.tourDate)
    if (!da || !db2) return 0
    const diff = da.getTime() - db2.getTime()
    if (diff !== 0) return diff
    return a.tourTime.localeCompare(b.tourTime)
  })

  return result
}
