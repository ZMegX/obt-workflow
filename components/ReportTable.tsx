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

function fmtDate(raw: string): string {
  if (!raw) return '—'
  return raw
}

export default function ReportTable({ rows, city, startDate, endDate }: ReportTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16 text-lg">
        No tour data found for the selected period.
      </div>
    )
  }

  // Compute totals
  const totals = rows.reduce(
    (acc, row) => ({
      numberOfGuests: acc.numberOfGuests + row.numberOfGuests,
      numberOfCashGuests: acc.numberOfCashGuests + row.numberOfCashGuests,
      mainGuidePayment: acc.mainGuidePayment + row.mainGuidePayment,
      secondGuidePayment: acc.secondGuidePayment + row.secondGuidePayment,
      thirdGuidePayment: acc.thirdGuidePayment + row.thirdGuidePayment,
      fourthGuidePayment: acc.fourthGuidePayment + row.fourthGuidePayment,
      fifthGuidePayment: acc.fifthGuidePayment + row.fifthGuidePayment,
      dailyExpenses: acc.dailyExpenses + row.dailyExpenses,
      totalPayout: acc.totalPayout + row.totalPayout,
      totalCost: acc.totalCost + row.totalCost,
    }),
    {
      numberOfGuests: 0,
      numberOfCashGuests: 0,
      mainGuidePayment: 0,
      secondGuidePayment: 0,
      thirdGuidePayment: 0,
      fourthGuidePayment: 0,
      fifthGuidePayment: 0,
      dailyExpenses: 0,
      totalPayout: 0,
      totalCost: 0,
    }
  )

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    padding: '10px 8px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.78rem',
    whiteSpace: 'nowrap',
    borderRight: '1px solid #2e4d78',
  }

  const cellStyle: React.CSSProperties = {
    padding: '8px',
    fontSize: '0.78rem',
    borderRight: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  }

  const totalRowStyle: React.CSSProperties = {
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    fontWeight: 700,
    padding: '10px 8px',
    fontSize: '0.78rem',
    whiteSpace: 'nowrap',
    borderRight: '1px solid #2e4d78',
  }

  return (
    <div className="overflow-x-auto">
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
        <thead>
          <tr>
            <th style={headerStyle}>Date</th>
            <th style={headerStyle}>Tour Name</th>
            <th style={headerStyle}>Time</th>
            <th style={headerStyle}>Cancelled?</th>
            <th style={headerStyle}>Participants</th>
            <th style={headerStyle}>Cash Guests</th>
            <th style={headerStyle}>Main Guide</th>
            <th style={headerStyle}>Payment</th>
            <th style={headerStyle}>2nd Guide</th>
            <th style={headerStyle}>Payment</th>
            <th style={headerStyle}>3rd Guide</th>
            <th style={headerStyle}>Payment</th>
            <th style={headerStyle}>4th Guide</th>
            <th style={headerStyle}>Payment</th>
            <th style={headerStyle}>5th Guide</th>
            <th style={headerStyle}>Payment</th>
            <th style={headerStyle}>MPM</th>
            <th style={headerStyle}>Daily Expenses</th>
            <th style={{ ...headerStyle, backgroundColor: '#163060' }}>Total Payout</th>
            <th style={{ ...headerStyle, backgroundColor: '#0f2040' }}>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const bg = i % 2 === 0 ? '#ffffff' : '#f3f4f6'
            const cs: React.CSSProperties = { ...cellStyle, backgroundColor: bg }
            return (
              <tr key={i}>
                <td style={cs}>{fmtDate(row.tourDate)}</td>
                <td style={cs}>{row.tourName || '—'}</td>
                <td style={cs}>{row.tourTime || '—'}</td>
                <td style={{ ...cs, color: row.wasCancelled?.toLowerCase() === 'yes' ? '#dc2626' : '#16a34a' }}>
                  {row.wasCancelled || '—'}
                </td>
                <td style={{ ...cs, textAlign: 'center' }}>{row.numberOfGuests || '—'}</td>
                <td style={{ ...cs, textAlign: 'center' }}>{row.numberOfCashGuests || '—'}</td>
                <td style={cs}>{row.mainGuideName || '—'}</td>
                <td style={{ ...cs, textAlign: 'right' }}>{fmt(row.mainGuidePayment)}</td>
                <td style={cs}>{row.secondGuideName || '—'}</td>
                <td style={{ ...cs, textAlign: 'right' }}>{fmt(row.secondGuidePayment)}</td>
                <td style={cs}>{row.thirdGuideName || '—'}</td>
                <td style={{ ...cs, textAlign: 'right' }}>{fmt(row.thirdGuidePayment)}</td>
                <td style={cs}>{row.fourthGuideName || '—'}</td>
                <td style={{ ...cs, textAlign: 'right' }}>{fmt(row.fourthGuidePayment)}</td>
                <td style={cs}>{row.fifthGuideName || '—'}</td>
                <td style={{ ...cs, textAlign: 'right' }}>{fmt(row.fifthGuidePayment)}</td>
                <td style={cs}>{row.mpmName || '—'}</td>
                <td style={{ ...cs, textAlign: 'right' }}>{fmt(row.dailyExpenses)}</td>
                <td style={{ ...cs, textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>
                  {fmt(row.totalPayout)}
                </td>
                <td style={{ ...cs, textAlign: 'right', fontWeight: 600, color: '#0f2040' }}>
                  {fmt(row.totalCost)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={totalRowStyle} colSpan={4}>TOTAL</td>
            <td style={{ ...totalRowStyle, textAlign: 'center' }}>{totals.numberOfGuests}</td>
            <td style={{ ...totalRowStyle, textAlign: 'center' }}>{totals.numberOfCashGuests}</td>
            <td style={totalRowStyle}></td>
            <td style={{ ...totalRowStyle, textAlign: 'right' }}>{fmt(totals.mainGuidePayment)}</td>
            <td style={totalRowStyle}></td>
            <td style={{ ...totalRowStyle, textAlign: 'right' }}>{fmt(totals.secondGuidePayment)}</td>
            <td style={totalRowStyle}></td>
            <td style={{ ...totalRowStyle, textAlign: 'right' }}>{fmt(totals.thirdGuidePayment)}</td>
            <td style={totalRowStyle}></td>
            <td style={{ ...totalRowStyle, textAlign: 'right' }}>{fmt(totals.fourthGuidePayment)}</td>
            <td style={totalRowStyle}></td>
            <td style={{ ...totalRowStyle, textAlign: 'right' }}>{fmt(totals.fifthGuidePayment)}</td>
            <td style={totalRowStyle}></td>
            <td style={{ ...totalRowStyle, textAlign: 'right' }}>{fmt(totals.dailyExpenses)}</td>
            <td style={{ ...totalRowStyle, textAlign: 'right', backgroundColor: '#163060' }}>{fmt(totals.totalPayout)}</td>
            <td style={{ ...totalRowStyle, textAlign: 'right', backgroundColor: '#0f2040' }}>{fmt(totals.totalCost)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
