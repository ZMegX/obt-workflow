import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { fetchTourData } from '@/lib/fetchTourData'
import { calculateSheet } from '@/lib/calculateSheet'
import { generatePdf } from '@/lib/generatePdf'
import { TourConfig } from '@/lib/tourConfig'

export const dynamic = 'force-dynamic'

function slugify(str: string): string {
  return str.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export async function POST(request: NextRequest) {
  let body: { weekly: boolean; month?: number; year?: number; tours: TourConfig[] }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { weekly, month, year, tours } = body

  if (!Array.isArray(tours) || tours.length === 0) {
    return NextResponse.json({ error: 'No tours specified' }, { status: 400 })
  }

  const zip = new JSZip()
  const errors: string[] = []

  for (const tourConfig of tours) {
    try {
      const tourData = await fetchTourData({ tourConfig, weekly, month, year })

      if (tourData.guides.length === 0) {
        // Skip tours with no data rather than generating an empty PDF
        continue
      }

      const sheet = calculateSheet(tourData)
      const pdfBuffer = generatePdf(sheet)

      const prefix = weekly ? 'Weekly_Report' : 'Monthly_Report'
      const citySlug = slugify(tourConfig.city)
      const tourSlug = slugify(tourConfig.tour)
      const suffix = weekly
        ? (() => {
            const m = tourData.monday
            const s = tourData.sunday
            if (m && s) {
              const pad = (n: number) => String(n).padStart(2, '0')
              const fmt = (d: Date) =>
                `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
              return `${fmt(m)}-${fmt(s)}`
            }
            return 'weekly'
          })()
        : `${month}.${year}`

      const filename = `${prefix}_${citySlug}_${tourSlug}_${suffix}.pdf`
      zip.file(filename, pdfBuffer)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${tourConfig.city} ${tourConfig.tour}: ${msg}`)
    }
  }

  const fileCount = Object.keys(zip.files).length
  if (fileCount === 0) {
    const detail = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : ''
    return NextResponse.json(
      { error: `No data found for the selected tours and period.${detail}` },
      { status: 404 },
    )
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${weekly ? 'weekly' : 'monthly'}_reports.zip"`,
    },
  })
}
