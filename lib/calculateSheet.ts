import { TourData } from './fetchTourData'
import { toYMD } from './reportUtils'

export interface SheetResult {
  tableHead: string[]
  tableBody: (string | number)[][]
  tableFooter: (string | number)[]
  title: string
}

function fmt(v: number): string {
  return v.toFixed(2)
}

export function calculateSheet(data: TourData): SheetResult {
  const { tourConfig, guides, managerFee, otherExpenses } = data

  // ── Title ────────────────────────────────────────────────────────────────
  const cityLabel = tourConfig.city
  const tourLabel = tourConfig.tour
  let title: string

  if (data.period === 'weekly' && data.monday && data.sunday) {
    const mondayStr = toYMD(data.monday)
    const sundayStr = toYMD(data.sunday)
    title = `Weekly Report ${cityLabel} ${tourLabel} - ${mondayStr}-${sundayStr}`
  } else {
    title = `Monthly Report ${cityLabel} ${tourLabel} - ${data.month}.${data.year}`
  }

  // ── Determine max guide columns ──────────────────────────────────────────
  let maxGuides = 0
  for (const g of guides) {
    let count = 0
    if (g.mainGuide) count = 1
    if (g.secondGuide) count = 2
    if (g.thirdGuide) count = 3
    if (g.fourthGuide) count = 4
    if (g.fifthGuide) count = 5
    if (count > maxGuides) maxGuides = count
  }
  if (maxGuides === 0 && guides.length > 0) maxGuides = 1

  const guideLabels = ['Main Guide', '2nd Guide', '3rd Guide', '4th Guide', '5th Guide'].slice(0, maxGuides)

  // ── Fixed headers ────────────────────────────────────────────────────────
  const fixedHeaders = [
    'City',
    'Date',
    'Total Revenue',
    'Total Expenses',
    'Google Costs',
    'Google Conv.',
    'Running Costs',
    'Gross Profit',
    'Net Profit',
    '25% Share',
    'Total Profit',
    'GYG Guests',
    'VIA Guests',
    'Website Guests',
    'Eventbrite Guests',
    'Meetup Guests',
    'Total Guests',
    'Participants',
    'Daily Expenses',
    'Manager Fee',
    'Other Expenses',
  ]

  const tableHead = [...fixedHeaders, ...guideLabels]

  // ── Body rows ────────────────────────────────────────────────────────────
  // Totals accumulators
  let totalRevenue = 0
  let totalGuidePayments = 0
  let totalDailyExpenses = 0
  let totalGoogleCost = 0
  let totalGoogleConv = 0
  let totalGygGuests = 0
  let totalViaGuests = 0
  let totalWebsiteGuests = 0
  let totalEventbriteGuests = 0
  let totalMeetupGuests = 0
  let totalAllGuests = 0
  let totalParticipants = 0

  const tableBody: (string | number)[][] = guides.map((g) => {
    const guidePayments =
      g.mainGuidePayment +
      g.secondGuidePayment +
      g.thirdGuidePayment +
      g.fourthGuidePayment +
      g.fifthGuidePayment

    const rowRevenue =
      g.websiteRevenue + g.botRevenue + g.eventbriteRevenue + g.meetupRevenue + g.airbnbRevenue

    const rowTotalExpenses = guidePayments + g.dailyExpenses
    const rowGrossProfit = rowRevenue - rowTotalExpenses
    const rowRunningCosts = rowGrossProfit * 0.4
    const rowNetProfit = rowGrossProfit - rowRunningCosts - g.googleAdsCost
    const rowShare25 = rowNetProfit > 0 ? rowNetProfit * 0.25 : 0
    const rowTotalProfit = rowNetProfit - rowShare25

    totalRevenue += rowRevenue
    totalGuidePayments += guidePayments
    totalDailyExpenses += g.dailyExpenses
    totalGoogleCost += g.googleAdsCost
    totalGoogleConv += g.googleAdsConversions
    totalGygGuests += g.gygGuests
    totalViaGuests += g.viaGuests
    totalWebsiteGuests += g.websiteGuests
    totalEventbriteGuests += g.eventbriteGuests
    totalMeetupGuests += g.meetupGuests
    totalAllGuests += g.totalGuests
    totalParticipants += g.participants

    const guideColumns: string[] = []
    const guideData = [
      { name: g.mainGuide, pay: g.mainGuidePayment },
      { name: g.secondGuide, pay: g.secondGuidePayment },
      { name: g.thirdGuide, pay: g.thirdGuidePayment },
      { name: g.fourthGuide, pay: g.fourthGuidePayment },
      { name: g.fifthGuide, pay: g.fifthGuidePayment },
    ]
    for (let i = 0; i < maxGuides; i++) {
      const gd = guideData[i]
      guideColumns.push(gd && gd.name ? `${gd.name} (€${fmt(gd.pay)})` : '')
    }

    return [
      cityLabel,
      g.date,
      fmt(rowRevenue),
      fmt(rowTotalExpenses),
      fmt(g.googleAdsCost),
      g.googleAdsConversions,
      fmt(rowRunningCosts),
      fmt(rowGrossProfit),
      fmt(rowNetProfit),
      fmt(rowShare25),
      fmt(rowTotalProfit),
      g.gygGuests,
      g.viaGuests,
      g.websiteGuests,
      g.eventbriteGuests,
      g.meetupGuests,
      g.totalGuests,
      g.participants,
      fmt(g.dailyExpenses),
      '',        // Manager Fee: empty per row
      '',        // Other Expenses: empty per row
      ...guideColumns,
    ]
  })

  // ── Footer (TOTAL row) ────────────────────────────────────────────────────
  const totalExpenses = totalGuidePayments + totalDailyExpenses + managerFee + otherExpenses
  const grossProfit = totalRevenue - totalExpenses
  const runningCosts = grossProfit * 0.4
  const netProfit = grossProfit - runningCosts - totalGoogleCost
  const share25 = netProfit > 0 ? netProfit * 0.25 : 0
  const totalProfit = netProfit - share25

  // Guide payment totals for footer
  const guidePayTotals: string[] = []
  const guidePayBySlot = [0, 0, 0, 0, 0]
  for (const g of guides) {
    guidePayBySlot[0] += g.mainGuidePayment
    guidePayBySlot[1] += g.secondGuidePayment
    guidePayBySlot[2] += g.thirdGuidePayment
    guidePayBySlot[3] += g.fourthGuidePayment
    guidePayBySlot[4] += g.fifthGuidePayment
  }
  for (let i = 0; i < maxGuides; i++) {
    guidePayTotals.push(`€${fmt(guidePayBySlot[i])}`)
  }

  const tableFooter: (string | number)[] = [
    'TOTAL',
    '',
    fmt(totalRevenue),
    fmt(totalExpenses),
    fmt(totalGoogleCost),
    totalGoogleConv,
    fmt(runningCosts),
    fmt(grossProfit),
    fmt(netProfit),
    fmt(share25),
    fmt(totalProfit),
    totalGygGuests,
    totalViaGuests,
    totalWebsiteGuests,
    totalEventbriteGuests,
    totalMeetupGuests,
    totalAllGuests,
    totalParticipants,
    fmt(totalDailyExpenses),
    fmt(managerFee),
    fmt(otherExpenses),
    ...guidePayTotals,
  ]

  return { tableHead, tableBody, tableFooter, title }
}
