import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OBT Weekly Guide Payment Report',
  description: 'Original Berlin Tours — Weekly Guide Payment Report Generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
