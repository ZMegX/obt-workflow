import getClientPromise from './mongodb'
import { parseDate } from './parseSheet'
import { TourConfig } from './tourConfig'
import {
  getLastWeek,
  normalizeDate,
  isGuideAMPeriod,
  guideTimeTo24Hour,
  bookingStartHour,
  toYMD,
  adMatchesTour,
} from './reportUtils'

// ─── Internal types ─────────────────────────────────────────────────────────

interface RawGuide {
  city: string
  tour: string
  date: string
  time: string
  main_guide: string
  main_guide_payment: string | number
  second_guide_name: string
  second_guide_payment: string | number
  third_guide_name: string
  third_guide_payment: string | number
  fourth_guide_name: string
  fourth_guide_payment: string | number
  fifth_guide_name: string
  fifth_guide_payment: string | number
  expenses: string | number
  participants: string | number
}

interface RawBooking {
  city: string
  tour_name: string
  status: string
  source: string
  total: string | number
  guests: string | number
  start_date: string
}

interface RawManager {
  City: string
  Tour: string
  Date: string
  Value: string | number
  ExpenseName: string
}

interface RawAd {
  name: string
  cost: number
  conversions: number
  date: Date | string
  name_date: string
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface MatchedGuide {
  date: string
  time: string
  mainGuide: string
  mainGuidePayment: number
  secondGuide: string
  secondGuidePayment: number
  thirdGuide: string
  thirdGuidePayment: number
  fourthGuide: string
  fourthGuidePayment: number
  fifthGuide: string
  fifthGuidePayment: number
  dailyExpenses: number
  participants: number
  // Booking revenue by source
  websiteRevenue: number
  botRevenue: number
  eventbriteRevenue: number
  meetupRevenue: number
  airbnbRevenue: number
  // Guest counts by source
  gygGuests: number
  viaGuests: number
  websiteGuests: number
  eventbriteGuests: number
  meetupGuests: number
  totalGuests: number
  // Google Ads
  googleAdsCost: number
  googleAdsConversions: number
}

export interface TourData {
  tourConfig: TourConfig
  guides: MatchedGuide[]
  managerFee: number
  otherExpenses: number
  period: 'monthly' | 'weekly'
  month?: number
  year?: number
  monday?: Date
  sunday?: Date
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function n(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === '') return 0
  const parsed = parseFloat(String(v).replace(',', '.'))
  return isNaN(parsed) ? 0 : parsed
}

/** Map city/tour label to the actual MongoDB `city` field value. */
function dbCity(tc: TourConfig): string {
  if (tc.city === 'Berlin Sachsenhausen') return 'Berlin'
  if (tc.city === 'Berlin Alternative') return 'Berlin'
  return tc.city
}

/** Build the regex used to match the `tour` field in Guides and `tour_name` in Bookings. */
function tourRegex(tc: TourConfig): RegExp {
  const t = tc.tour.toLowerCase()
  if (t.includes('sachsenhausen')) return /Sachsenhausen/i
  if (t.includes('alternative')) return /Alternative/i
  if (t.includes('beer') || (t.includes('food') && t.includes('berlin'))) {
    return /Beer.*(Food|Garden)|Food.*Beer/i
  }
  if (t === 'walking tour' || t.includes('walking')) return /walking tour/i
  if (t.includes('pub crawl') || t.includes('crawl')) {
    return /^(?!.*[Aa]lternative).*(Crawl|Pub|Tapas)/i
  }
  // Escape any regex special characters from user input before constructing the fallback
  const escaped = tc.tour.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(escaped, 'i')
}

/** True if the guide time matches the expected AM/PM period. */
function guideMatchesPeriod(timeStr: string, period: 'AM' | 'PM'): boolean {
  const isAM = isGuideAMPeriod(timeStr)
  return period === 'AM' ? isAM : !isAM
}

/** True if a guide date falls within [startDate, endDate] (inclusive, UTC midnight). */
function guideInRange(dateStr: string, start: Date, end: Date): boolean {
  const d = parseDate(dateStr)
  if (!d) return false
  const mid = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  return mid >= start && mid <= end
}

/** Convert a guide date "M/D/YYYY" to midnight UTC Date. */
function guideMidnight(dateStr: string): Date | null {
  const d = parseDate(dateStr)
  if (!d) return null
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Extract the date midnight UTC from a booking start_date "YYYY-MM-DD HH:mm:ss". */
function bookingMidnight(startDate: string): Date | null {
  const datePart = startDate.split(' ')[0]
  const d = parseDate(datePart)
  if (!d) return null
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** True if a booking should be included in revenue (excludes GYG / VIA / GetYourGuide). */
function isRevenueSource(source: string): boolean {
  const s = source.toLowerCase()
  return s !== 'gyg' && s !== 'getyourguide' && s !== 'viator' && s !== 'viator.com'
}

const BOT_COMMISSION = 0.25

function revenueFromBooking(b: RawBooking): number {
  const total = n(b.total)
  const s = b.source.toLowerCase()
  if (s === 'bot') return total * (1 - BOT_COMMISSION)
  return isRevenueSource(b.source) ? total : 0
}

/** Accumulate guest counts per source. */
interface BookingAccumulator {
  websiteRevenue: number
  botRevenue: number
  eventbriteRevenue: number
  meetupRevenue: number
  airbnbRevenue: number
  gygGuests: number
  viaGuests: number
  websiteGuests: number
  eventbriteGuests: number
  meetupGuests: number
  totalGuests: number
}

function addGuests(
  acc: BookingAccumulator,
  b: RawBooking,
): void {
  const guests = n(b.guests)
  const s = b.source.toLowerCase()
  acc.totalGuests += guests
  if (s === 'gyg' || s === 'getyourguide') {
    acc.gygGuests += guests
  } else if (s === 'viator' || s === 'viator.com') {
    acc.viaGuests += guests
  } else if (s === 'website') {
    acc.websiteGuests += guests
    acc.websiteRevenue += revenueFromBooking(b)
  } else if (s === 'eventbrite') {
    acc.eventbriteGuests += guests
    acc.eventbriteRevenue += revenueFromBooking(b)
  } else if (s === 'meetup' || s === 'meetup.com') {
    acc.meetupGuests += guests
    acc.meetupRevenue += revenueFromBooking(b)
  } else if (s === 'bot') {
    acc.botRevenue += revenueFromBooking(b)
  } else if (s === 'airbnb') {
    acc.airbnbRevenue += revenueFromBooking(b)
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchTourData(params: {
  tourConfig: TourConfig
  weekly: boolean
  month?: number
  year?: number
}): Promise<TourData> {
  const { tourConfig, weekly } = params

  // ── Date range ──────────────────────────────────────────────────────────────
  let monday: Date | undefined, sunday: Date | undefined
  let startDate: Date, endDate: Date
  let month: number, year: number

  if (weekly) {
    const w = getLastWeek()
    monday = w.monday
    sunday = w.sunday
    startDate = monday
    endDate = sunday
    month = monday.getUTCMonth() + 1
    year = monday.getUTCFullYear()
  } else {
    month = params.month ?? new Date().getMonth() + 1
    year = params.year ?? new Date().getFullYear()
    startDate = new Date(Date.UTC(year, month - 1, 1))
    endDate = new Date(Date.UTC(year, month, 0))
  }

  const city = dbCity(tourConfig)
  const tRegex = tourRegex(tourConfig)
  const isBeerFood = tourConfig.tour.toLowerCase().includes('beer') ||
    (tourConfig.tour.toLowerCase().includes('food') && tourConfig.city.toLowerCase().includes('beer'))
  const isWalkingTour = tourConfig.tour.toLowerCase() === 'walking tour'

  const client = await getClientPromise()
  const db = client.db('test')

  // ── Fetch guides ────────────────────────────────────────────────────────────
  const allGuides = await db.collection('Guides')
    .find({ city })
    .toArray() as unknown as RawGuide[]

  const guides = allGuides.filter((g) => {
    if (!tRegex.test(g.tour ?? '')) return false
    if (!guideInRange(g.date ?? '', startDate, endDate)) return false
    if (!guideMatchesPeriod(g.time ?? '', tourConfig.period)) return false
    return true
  })

  if (guides.length === 0) {
    return {
      tourConfig,
      guides: [],
      managerFee: 0,
      otherExpenses: 0,
      period: weekly ? 'weekly' : 'monthly',
      month,
      year,
      monday,
      sunday,
    }
  }

  // ── Collect guide dates for scoped booking query ─────────────────────────
  const guideYMDs = new Set(
    guides
      .map((g) => {
        const d = parseDate(g.date ?? '')
        return d ? toYMD(d) : null
      })
      .filter(Boolean) as string[],
  )

  // ── Fetch bookings for this city ─────────────────────────────────────────
  // Fetch a broader set, then filter in memory
  const rawBookings = await db.collection('Bookings')
    .find({
      city,
      status: { $nin: ['canceled', 'Canceled', 'CANCELED'] },
    })
    .toArray() as unknown as RawBooking[]

  const relevantBookings = rawBookings.filter((b) => {
    if (!tRegex.test(b.tour_name ?? '')) return false
    const bMid = bookingMidnight(b.start_date ?? '')
    if (!bMid) return false
    const ymd = toYMD(bMid)
    return guideYMDs.has(ymd)
  })

  // ── Fetch Google Ads ──────────────────────────────────────────────────────
  const allAds = await db.collection('google_ads')
    .find({})
    .toArray() as unknown as RawAd[]

  // Build a map: YYYY-MM-DD → {cost, conversions}
  const adsByDate: Record<string, { cost: number; conversions: number }> = {}
  for (const ad of allAds) {
    if (!adMatchesTour(ad, tourConfig.tour, tourConfig.city)) continue
    // Extract date from name_date field: "Tour Name_YYYY-MM-DD"
    const nameDateStr = ad.name_date ?? ''
    const underscoreIdx = nameDateStr.lastIndexOf('_')
    if (underscoreIdx < 0) continue
    const ymd = nameDateStr.slice(underscoreIdx + 1)
    if (!guideYMDs.has(ymd)) continue
    if (!adsByDate[ymd]) adsByDate[ymd] = { cost: 0, conversions: 0 }
    adsByDate[ymd].cost += n(ad.cost)
    adsByDate[ymd].conversions += n(ad.conversions)
  }

  // ── Fetch manager fees ────────────────────────────────────────────────────
  const managerDocs = await db.collection('Managers')
    .find({ City: city })
    .toArray() as unknown as RawManager[]

  let managerFee = 0
  let otherExpenses = 0

  for (const doc of managerDocs) {
    if (!tRegex.test(doc.Tour ?? '')) continue
    const docDate = parseDate(doc.Date ?? '')
    if (!docDate) continue
    const docMonth = docDate.getUTCMonth() + 1
    const docYear = docDate.getUTCFullYear()

    if (weekly) {
      // Weekly: accept if the date falls in any guide-covered month/year
      const inRange = monday && sunday
        ? docDate >= monday && docDate <= sunday
        : docMonth === month && docYear === year
      if (!inRange) continue
    } else {
      if (docMonth !== month || docYear !== year) continue
    }

    const val = n(doc.Value)
    if ((doc.ExpenseName ?? '').toLowerCase().includes('manager fee') ||
        doc.ExpenseName === 'Manager Fee') {
      managerFee += val
    } else {
      otherExpenses += val
    }
  }

  // ── Match bookings to guides ───────────────────────────────────────────────
  const matchedGuides: MatchedGuide[] = guides.map((g) => {
    const gMid = guideMidnight(g.date ?? '')
    const guideHour = guideTimeTo24Hour(g.time ?? '')
    const gYMD = gMid ? toYMD(gMid) : ''

    const booking = {
      websiteRevenue: 0,
      botRevenue: 0,
      eventbriteRevenue: 0,
      meetupRevenue: 0,
      airbnbRevenue: 0,
      gygGuests: 0,
      viaGuests: 0,
      websiteGuests: 0,
      eventbriteGuests: 0,
      meetupGuests: 0,
      totalGuests: 0,
    }

    for (const b of relevantBookings) {
      const bMid = bookingMidnight(b.start_date ?? '')
      if (!bMid) continue
      if (!gMid || bMid.getTime() !== gMid.getTime()) continue

      if (isBeerFood) {
        // Beer Food: match on date only, no time check
        addGuests(booking, b)
        continue
      }

      const bHour = bookingStartHour(b.start_date ?? '')

      if (isWalkingTour) {
        // Berlin Walking Tour: match by exact hour (±1h) to separate 10AM vs 12PM tours
        if (Math.abs(bHour - guideHour) <= 1) {
          addGuests(booking, b)
        }
        continue
      }

      // Standard period matching: AM < 17:00, PM >= 17:00
      const bookingIsAM = bHour < 17
      const guideIsAM = tourConfig.period === 'AM'
      if (bookingIsAM === guideIsAM) {
        addGuests(booking, b)
      }
    }

    const adEntry = adsByDate[gYMD] ?? { cost: 0, conversions: 0 }

    return {
      date: normalizeDate(g.date ?? ''),
      time: g.time ?? '',
      mainGuide: g.main_guide ?? '',
      mainGuidePayment: n(g.main_guide_payment),
      secondGuide: g.second_guide_name ?? '',
      secondGuidePayment: n(g.second_guide_payment),
      thirdGuide: g.third_guide_name ?? '',
      thirdGuidePayment: n(g.third_guide_payment),
      fourthGuide: g.fourth_guide_name ?? '',
      fourthGuidePayment: n(g.fourth_guide_payment),
      fifthGuide: g.fifth_guide_name ?? '',
      fifthGuidePayment: n(g.fifth_guide_payment),
      dailyExpenses: n(g.expenses),
      participants: n(g.participants),
      ...booking,
      googleAdsCost: adEntry.cost,
      googleAdsConversions: adEntry.conversions,
    }
  })

  // Sort by date then time
  matchedGuides.sort((a, b) => {
    const da = parseDate(a.date)
    const db2 = parseDate(b.date)
    if (!da || !db2) return 0
    const diff = da.getTime() - db2.getTime()
    if (diff !== 0) return diff
    return a.time.localeCompare(b.time)
  })

  return {
    tourConfig,
    guides: matchedGuides,
    managerFee,
    otherExpenses,
    period: weekly ? 'weekly' : 'monthly',
    month,
    year,
    monday,
    sunday,
  }
}

// Re-export types for consumers
export type { TourConfig }
