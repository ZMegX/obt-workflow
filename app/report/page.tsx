'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ReportTable from '@/components/ReportTable'
import { TourRow } from '@/lib/parseSheet'

interface ReportData {
  city: string
  startDate: string
  endDate: string
  rows: TourRow[]
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function ReportContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const city = searchParams.get('city') ?? 'Amsterdam'
  const startDate = searchParams.get('startDate') ?? '2026-06-01'
  const endDate = searchParams.get('endDate') ?? '2026-06-07'

  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ city, startDate, endDate })
      const res = await fetch(`/api/report?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load report')
      } else {
        setData(json)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }, [city, startDate, endDate])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header — visible on screen and in print */}
      <div className="bg-white rounded-xl shadow mb-4 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Original Berlin Tours</h1>
            <h2 className="text-lg font-semibold text-blue-900 mt-1">
              Weekly Guide Payment Report — {city} — {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>

          <div className="flex gap-3 no-print">
            <button
              onClick={() => router.push('/')}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              ← Back
            </button>
            <button
              onClick={fetchReport}
              className="border border-blue-600 text-blue-700 hover:bg-blue-50 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              ↻ Refresh
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2 px-5 rounded-lg transition-colors text-sm"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="bg-white rounded-xl shadow p-4">
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
            <p className="mt-3 text-gray-500">Loading report data…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="text-sm text-gray-500 mb-3">
              {data.rows.length === 0
                ? 'No tours found for this period.'
                : `${data.rows.length} tour${data.rows.length !== 1 ? 's' : ''} found`}
            </div>
            <ReportTable
              rows={data.rows}
              city={data.city}
              startDate={data.startDate}
              endDate={data.endDate}
            />
          </>
        )}
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-6 text-xs text-gray-400 text-center">
        Original Berlin Tours · Weekly Guide Payment Report · {city} · {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .bg-gray-100 { background: white; padding: 0; }
          .rounded-xl, .shadow { border-radius: 0; box-shadow: none; }
        }
      `}</style>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  )
}
