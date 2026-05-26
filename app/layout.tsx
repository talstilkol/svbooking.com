import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import dynamic from "next/dynamic";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";
import RouteProgress from "@/components/RouteProgress";
import { OrganizationJsonLd, SearchActionJsonLd } from "@/components/SchemaOrg";
import ErrorBoundary from "@/components/ErrorBoundary";
import LocaleRuntime from "@/components/LocaleRuntime";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Non-critical components — dynamically imported for code-splitting (reduces initial JS bundle)
const BackToTop = dynamic(() => import("@/components/BackToTop"));
const CookieConsent = dynamic(() => import("@/components/CookieConsent"));
const MobileBottomBar = dynamic(() => import("@/components/MobileBottomBar"));
const AccessibilityPanel = dynamic(() => import("@/components/AccessibilityPanel"));
const OfflineBanner = dynamic(() => import("@/components/OfflineBanner"));
const PerformanceMonitor = dynamic(() => import("@/components/PerformanceMonitor"));
const ServiceWorkerRegistration = dynamic(() => import("@/components/ServiceWorkerRegistration"));
const CompareWidget = dynamic(() => import("@/components/CompareWidget"));

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com'),
  title: {
    default: "SV Booking - Hotel Price Comparison",
    template: "%s | SV Booking",
  },
  description: "Compare provider-returned hotel prices when configured sources respond. Find cheaper dates and get evidence-based recommendations across a curated global catalog.",
  keywords: ["hotel comparison", "cheap hotels", "booking", "expedia", "price comparison", "travel", "hotel deals", "available hotel price", "hotel price comparison"],
  openGraph: {
    title: "SV Booking - Hotel Price Comparison",
    description: "Compare hotel prices from available providers across a curated global catalog.",
    type: "website",
    locale: "en_US",
    siteName: "SV Booking",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "SV Booking" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SV Booking - Hotel Price Comparison",
    description: "Compare provider-returned hotel prices when rates are available",
    images: ["/api/og"],
  },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://data.xotelo.com" />
        <link rel="dns-prefetch" href="https://data.xotelo.com" />
        <link rel="dns-prefetch" href="https://serpapi.com" />
        <link rel="dns-prefetch" href="https://booking-com.p.rapidapi.com" />
        <link rel="dns-prefetch" href="https://test.api.amadeus.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full flex flex-col bg-linear-to-b from-sky-50 via-white to-amber-50/30">
        <ToastProvider>
        <LocaleRuntime />
        {/* Skip to main content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Skip to main content
        </a>
        <OrganizationJsonLd />
        <SearchActionJsonLd searchUrl="https://svbooking.com" />
        <RouteProgress />
        <OfflineBanner />
        <Navbar />
        <ErrorBoundary fallback={<div className="flex-1 flex items-center justify-center p-8 text-center"><div><p className="text-4xl mb-4">Something went wrong</p><Link href="/" className="text-blue-600 underline">Go home</Link></div></div>}>
        <main id="main-content" className="pt-16 flex-1 pb-14 md:pb-0">{children}</main>
        </ErrorBoundary>
        <Footer />
        <BackToTop />
        <MobileBottomBar />
        <CompareWidget />
        <AccessibilityPanel />
        <CookieConsent />
        <PerformanceMonitor />
        <ServiceWorkerRegistration />
        </ToastProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
