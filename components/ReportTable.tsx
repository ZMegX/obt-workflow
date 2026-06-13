'use client'

import { TourRow } from '@/lib/parseSheet'

interface ReportTableProps {
  rows: TourRow[]
  city: string
  startDate: string
  endDate: string
}

function fmt(n: number): string {
  return n === 0 ? '—' : `€${n.toFixed(2)}`
}

function fmtNum(n: number): string {
  return n === 0 ? '—' : `${n}`
}

function fmtDate(raw: string): string {
  if (!raw) return '—'
  // Strip time portion and reformat
  const dateOnly = raw.split(' ')[0]
  const parts = dateOnly.split('/')
  if (parts.length === 3) {
    const [m, d, y] = parts
    return `${d}/${m}/${y}`
  }
  return dateOnly
}

/**
 * Collect all unique guide names that appear anywhere in the week's data.
 * Returns them sorted by total earnings descending so the highest-paid guide
 * appears first (makes the table easier to scan).
 */
function collectGuideNames(rows: TourRow[]): string[] {
  const earnings: Record<string, number> = {}

  for (const row of rows) {
    const guides: Array<{ name: string; payment: number }> = [
      { name: row.mainGuideName,   payment: row.mainGuidePayment },
      { name: row.secondGuideName, payment: row.secondGuidePayment },
      { name: row.thirdGuideName,  payment: row.thirdGuidePayment },
      { name: row.fourthGuideName, payment: row.fourthGuidePayment },
      { name: row.fifthGuideName,  payment: row.fifthGuidePayment },
    ]
    for (const { name, payment } of guides) {
      if (!name || name.trim() === '') continue
      const key = name.trim()
      earnings[key] = (earnings[key] ?? 0) + payment
    }
  }

  return Object.keys(earnings).sort((a, b) => (earnings[b] ?? 0) - (earnings[a] ?? 0))
}

/**
 * Given a row and a guide name, find how much that guide was paid on that tour.
 * A guide may appear in any of the 5 guide slots.
 */
function paymentForGuide(row: TourRow, guideName: string): number {
  const slots: Array<{ name: string; payment: number }> = [
    { name: row.mainGuideName,   payment: row.mainGuidePayment },
    { name: row.secondGuideName, payment: row.secondGuidePayment },
    { name: row.thirdGuideName,  payment: row.thirdGuidePayment },
    { name: row.fourthGuideName, payment: row.fourthGuidePayment },
    { name: row.fifthGuideName,  payment: row.fifthGuidePayment },
  ]
  for (const { name, payment } of slots) {
    if (name?.trim() === guideName) return payment
  }
  return 0
}

export default function ReportTable({ rows, city, startDate, endDate }: ReportTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16 text-lg">
        No tour data found for the selected period.
      </div>
    )
  }

  // Build dynamic guide columns
  const guideNames = collectGuideNames(rows)

  // Compute totals
  const totalGuests     = rows.reduce((s, r) => s + r.numberOfGuests, 0)
  const totalCash       = rows.reduce((s, r) => s + r.numberOfCashGuests, 0)
  const totalExpenses   = rows.reduce((s, r) => s + r.dailyExpenses, 0)
  const totalPayout     = rows.reduce((s, r) => s + r.totalPayout, 0)
  const totalCost       = rows.reduce((s, r) => s + r.totalCost, 0)

  const guideTotal: Record<string, number> = {}
  for (const name of guideNames) {
    guideTotal[name] = rows.reduce((s, r) => s + paymentForGuide(r, name), 0)
  }

  const hdr: React.CSSProperties = {
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    padding: '10px 8px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    borderRight: '1px solid #2e4d78',
  }

  const cell: React.CSSProperties = {
    padding: '8px',
    fontSize: '0.75rem',
    borderRight: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  }

  const foot: React.CSSProperties = {
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    fontWeight: 700,
    padding: '10px 8px',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    borderRight: '1px solid #2e4d78',
  }

  return (
    <div className="overflow-x-auto">
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
        <thead>
          <tr>
            {/* Fixed left columns */}
            <th style={hdr}>City</th>
            <th style={hdr}>Date</th>
            <th style={hdr}>Tour Name</th>
            <th style={hdr}>Time</th>
            <th style={hdr}>Cancelled?</th>
            <th style={hdr}>Participants</th>
            <th style={hdr}>Cash Guests</th>
            <th style={hdr}>MPM</th>
            <th style={hdr}>Daily Expenses</th>
            <th style={hdr}>Total Payout</th>
            <th style={{ ...hdr, backgroundColor: '#0f2040' }}>Total Cost</th>
            {/* Dynamic guide columns */}
            {guideNames.map((name) => (
              <th key={name} style={{ ...hdr, backgroundColor: '#163060' }}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const bg = i % 2 === 0 ? '#ffffff' : '#f3f4f6'
            const cs: React.CSSProperties = { ...cell, backgroundColor: bg }
            return (
              <tr key={i}>
                <td style={cs}>{city}</td>
                <td style={cs}>{fmtDate(row.tourDate)}</td>
                <td style={cs}>{row.tourName || '—'}</td>
                <td style={cs}>{row.tourTime || '—'}</td>
                <td style={{
                  ...cs,
                  color: row.wasCancelled?.toLowerCase() === 'yes' ? '#dc2626' : '#16a34a',
                  fontWeight: 500,
                }}>
                  {row.wasCancelled || '—'}
                </td>
                <td style={{ ...cs, textAlign: 'center' }}>{fmtNum(row.numberOfGuests)}</td>
                <td style={{ ...cs, textAlign: 'center' }}>{fmtNum(row.numberOfCashGuests)}</td>
                <td style={cs}>{row.mpmName || '—'}</td>
                <td style={{ ...cs, textAlign: 'right' }}>{fmt(row.dailyExpenses)}</td>
                <td style={{ ...cs, textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>
                  {fmt(row.totalPayout)}
                </td>
                <td style={{ ...cs, textAlign: 'right', fontWeight: 600, color: '#0f2040' }}>
                  {fmt(row.totalCost)}
                </td>
                {/* Dynamic guide payment cells */}
                {guideNames.map((name) => {
                  const p = paymentForGuide(row, name)
                  return (
                    <td key={name} style={{ ...cs, textAlign: 'right', backgroundColor: p > 0 ? (i % 2 === 0 ? '#f0f4ff' : '#e8eeff') : bg }}>
                      {p > 0 ? fmt(p) : '—'}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={foot} colSpan={2}>TOTAL</td>
            <td style={foot}></td>
            <td style={foot}></td>
            <td style={foot}></td>
            <td style={{ ...foot, textAlign: 'center' }}>{totalGuests}</td>
            <td style={{ ...foot, textAlign: 'center' }}>{totalCash}</td>
            <td style={foot}></td>
            <td style={{ ...foot, textAlign: 'right' }}>{fmt(totalExpenses)}</td>
            <td style={{ ...foot, textAlign: 'right' }}>{fmt(totalPayout)}</td>
            <td style={{ ...foot, textAlign: 'right', backgroundColor: '#0f2040' }}>{fmt(totalCost)}</td>
            {/* Guide totals */}
            {guideNames.map((name) => (
              <td key={name} style={{ ...foot, textAlign: 'right', backgroundColor: '#163060' }}>
                {fmt(guideTotal[name] ?? 0)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
