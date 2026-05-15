import type { Metadata } from 'next'
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google'
// `@vercel/analytics` deliberately not used — we're on Railway, not Vercel.
// The component injects <script src="/_vercel/insights/script.js"> which only
// resolves on Vercel's edge; on Railway it 502s and the browser tries to
// parse the error response as JS. Swap for PostHog / similar if we need
// analytics back.
import { ThemeProvider } from '@/components/theme-provider'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

// Geist = body + UI + headings. Geist Mono = code + captions.
// Plus Jakarta Sans = the `scoop` wordmark ONLY (per the design-system rules).
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'scoop · Email lead-gen for AI agents',
  description:
    'Verified emails for any LinkedIn profile, billed per result. Refunded automatically when nothing is found. An agent skill in the sundae_bar portfolio.',
  icons: {
    // Scoop "agent-blob-07-purple-cyan" mark from the sundae_bar design system.
    // Single high-res PNG — browsers downscale to favicon sizes; iOS uses it
    // as the home-screen icon.
    icon: { url: '/icon.png', type: 'image/png' },
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
