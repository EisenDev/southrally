import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'South Rally',
    template: '%s | South Rally',
  },
  description:
    'Book a South Rally pickleball court, join open play, check in quickly, and earn member rewards.',
  keywords: ['pickleball booking', 'court scheduler', 'open play check-in', 'paddle stacking', 'pickleball club'],
  icons: {
    icon: '/south-rally-logo.png',
    shortcut: '/south-rally-logo.png',
    apple: '/south-rally-logo.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
