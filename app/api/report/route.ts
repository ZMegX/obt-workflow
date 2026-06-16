import { NextRequest, NextResponse } from 'next/server'
import { fetchAndParseSheet, getSheetConfig } from '@/lib/parseSheet'
import { fetchAndParseMongoData, isMongoCity } from '@/lib/parseMongo'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const city = searchParams.get('city') ?? 'Amsterdam'
  const startDateStr = searchParams.get('startDate') ?? '2026-06-01'
  const endDateStr = searchParams.get('endDate') ?? '2026-06-07'

  const mongoCity = isMongoCity(city)
  const sheetConfig = mongoCity ? null : getSheetConfig(city)
  if (!mongoCity && !sheetConfig) {
    return NextResponse.json({ error: `Unknown city: ${city}` }, { status: 400 })
  }

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
  }

  try {
    const rows = mongoCity
      ? await fetchAndParseMongoData(city, startDate, endDate)
      : await fetchAndParseSheet(sheetConfig!.id, sheetConfig!.sheetName, startDate, endDate)
    return NextResponse.json({ city, startDate: startDateStr, endDate: endDateStr, rows })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
