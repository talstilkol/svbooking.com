import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { WebsiteJsonLd } from "@/components/JsonLd";

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
  },
  twitter: {
    card: "summary_large_image",
    title: "SV Booking - Hotel Price Comparison",
    description: "Compare hotel prices from Booking.com, Expedia, Hotels.com & more",
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
      <body className="min-h-full flex flex-col bg-gradient-to-b from-sky-50 via-white to-amber-50/30">
        <WebsiteJsonLd />
        <Navbar />
        <main className="pt-16 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
