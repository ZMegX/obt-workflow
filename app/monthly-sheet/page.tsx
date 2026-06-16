'use client'

import { useState } from 'react'
import { ALL_TOURS, TourConfig } from '@/lib/tourConfig'

const CURRENT_YEAR = new Date().getFullYear()

export default function MonthlySheetPage() {
  const [weekly, setWeekly] = useState(false)
  const [month, setMonth] = useState(5)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [selectedTours, setSelectedTours] = useState<boolean[]>(ALL_TOURS.map(() => true))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const toggleTour = (idx: number) => {
    setSelectedTours((prev) => prev.map((v, i) => (i === idx ? !v : v)))
  }

  const toggleAll = (checked: boolean) => {
    setSelectedTours(ALL_TOURS.map(() => checked))
  }

  const handleGenerate = async () => {
    setError(null)
    setSuccessMsg(null)

    const tours: TourConfig[] = ALL_TOURS.filter((_, i) => selectedTours[i])
    if (tours.length === 0) {
      setError('Please select at least one tour.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/monthly-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekly, month, year, tours }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Unknown error' }))
        setError(json.error ?? `Server error ${res.status}`)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = weekly ? 'weekly_reports.zip' : `monthly_reports_${month}_${year}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setSuccessMsg('ZIP downloaded successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const allChecked = selectedTours.every(Boolean)
  const noneChecked = selectedTours.every((v) => !v)

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Original Europe Tours</h1>
          <p className="text-gray-500 mt-1 text-sm">Monthly / Weekly Sheet Generator</p>
        </div>

        {/* Period toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Period</label>
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setWeekly(false)}
              className={`px-5 py-2 text-sm font-medium transition-colors ${
                !weekly
                  ? 'bg-blue-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setWeekly(true)}
              className={`px-5 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                weekly
                  ? 'bg-blue-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Month / Year selectors (hidden for Weekly) */}
        {!weekly && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })} ({i + 1})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {weekly && (
          <div className="mb-6 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            Will generate reports for the most recently completed Mon–Sun week.
          </div>
        )}

        {/* Tour checklist */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Tours</label>
            <div className="flex gap-3 text-xs">
              <button
                onClick={() => toggleAll(true)}
                disabled={allChecked}
                className="text-blue-700 hover:underline disabled:opacity-40"
              >
                Select all
              </button>
              <button
                onClick={() => toggleAll(false)}
                disabled={noneChecked}
                className="text-blue-700 hover:underline disabled:opacity-40"
              >
                Deselect all
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {ALL_TOURS.map((tc, idx) => (
              <label
                key={`${tc.city}-${tc.tour}-${tc.period}`}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTours[idx]}
                  onChange={() => toggleTour(idx)}
                  className="h-4 w-4 text-blue-700 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">
                  {tc.city} — {tc.tour}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  tc.period === 'AM'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {tc.period}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Error / success messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
            ✓ {successMsg}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
              Generating…
            </>
          ) : (
            'Generate & Download ZIP'
          )}
        </button>

        {/* Back link */}
        <p className="text-center mt-4 text-sm text-gray-500">
          <a href="/" className="text-blue-700 hover:underline">← Back to Guide Payment Report</a>
        </p>
      </div>
    </main>
  )
}
