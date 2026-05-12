import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";
import ScrollToTop from "@/components/ScrollToTop";
import BackToTop from "@/components/BackToTop";
import CookieConsent from "@/components/CookieConsent";
import RouteProgress from "@/components/RouteProgress";
import { WebsiteJsonLd } from "@/components/JsonLd";
import MobileBottomBar from "@/components/MobileBottomBar";
import SocialProof from "@/components/SocialProof";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { OrganizationJsonLd, SearchActionJsonLd } from "@/components/SchemaOrg";
import OfflineBanner from "@/components/OfflineBanner";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import CompareWidget from "@/components/CompareWidget";
import PriceDropAlert from "@/components/PriceDropAlert";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SV Booking - Hotel Price Comparison",
    template: "%s | SV Booking",
  },
  description: "Compare hotel prices from Booking.com, Expedia, Hotels.com, Agoda & more. Find cheaper dates and get AI-powered recommendations across 20 cities worldwide.",
  keywords: ["hotel comparison", "cheap hotels", "booking", "expedia", "price comparison", "travel", "hotel deals"],
  openGraph: {
    title: "SV Booking - Hotel Price Comparison",
    description: "Compare hotel prices from 8+ providers. Find the best deals across 20 cities worldwide.",
    type: "website",
    locale: "en_US",
    siteName: "SV Booking",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "SV Booking" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SV Booking - Hotel Price Comparison",
    description: "Compare hotel prices from Booking.com, Expedia, Hotels.com & more",
    images: ["/api/og"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://data.xotelo.com" />
        <link rel="dns-prefetch" href="https://data.xotelo.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full flex flex-col bg-linear-to-b from-sky-50 via-white to-amber-50/30">
        <ToastProvider>
        {/* Skip to main content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Skip to main content
        </a>
        <WebsiteJsonLd />
        <OrganizationJsonLd />
        <SearchActionJsonLd searchUrl="https://svbooking.com" />
        <RouteProgress />
        <OfflineBanner />
        <ScrollToTop />
        <Navbar />
        <ErrorBoundary fallback={<div className="flex-1 flex items-center justify-center p-8 text-center"><div><p className="text-4xl mb-4">Something went wrong</p><a href="/" className="text-blue-600 underline">Go home</a></div></div>}>
        <main id="main-content" className="pt-16 flex-1 pb-14 md:pb-0">{children}</main>
        </ErrorBoundary>
        <Footer />
        <BackToTop />
        <MobileBottomBar />
        <SocialProof />
        <CompareWidget />
        <PriceDropAlert />
        <AccessibilityPanel />
        <CookieConsent />
        <PerformanceMonitor />
        </ToastProvider>
      </body>
    </html>
  );
}
