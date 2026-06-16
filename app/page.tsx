'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCityList } from '@/lib/parseSheet'
import { MONGO_CITY_MAP } from '@/lib/parseMongo'

const CITIES = [...getCityList(), ...Object.keys(MONGO_CITY_MAP)].sort()

export default function HomePage() {
  const router = useRouter()
  const [city, setCity] = useState(CITIES[0])
  const [startDate, setStartDate] = useState('2026-06-01')
  const [endDate, setEndDate] = useState('2026-06-07')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const params = new URLSearchParams({ city, startDate, endDate })
    router.push(`/report?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Original Europe Tours</h1>
          <p className="text-gray-500 mt-1 text-sm">Weekly Guide Payment Report Generator</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City / Tour</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Week Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Week Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Week End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Week End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </form>
      </div>
    </main>
  )
}
