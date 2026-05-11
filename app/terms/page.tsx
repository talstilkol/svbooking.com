import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'SV Booking terms of service — usage terms, disclaimers, and conditions for using our hotel price comparison service.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: May 11, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800">1. Acceptance</h2>
            <p className="text-slate-600 leading-relaxed">
              By using SV Booking, you agree to these terms. If you don&apos;t agree,
              please don&apos;t use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">2. Service Description</h2>
            <p className="text-slate-600 leading-relaxed">
              SV Booking is a free hotel price comparison tool. We aggregate pricing data
              from multiple booking providers and display it for comparison purposes.
              We do not process bookings directly — all bookings are completed on the
              respective provider&apos;s website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">3. Price Accuracy</h2>
            <p className="text-slate-600 leading-relaxed">
              While we strive to show accurate, real-time prices, we cannot guarantee that
              displayed prices are always current. Prices may change between the time we
              fetch them and when you visit the provider&apos;s site. Always verify the final
              price on the booking provider&apos;s website before completing your reservation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">4. No Warranty</h2>
            <p className="text-slate-600 leading-relaxed">
              SV Booking is provided &quot;as is&quot; without warranties of any kind. We are not
              responsible for booking errors, price discrepancies, or issues with third-party
              booking providers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">5. User Conduct</h2>
            <p className="text-slate-600 leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>Scrape, crawl, or otherwise extract data from our service programmatically</li>
              <li>Attempt to overload our servers or the APIs we rely on</li>
              <li>Use the service for any illegal purpose</li>
              <li>Misrepresent yourself or your intent when using the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">6. Intellectual Property</h2>
            <p className="text-slate-600 leading-relaxed">
              All content, design, and code on SV Booking is our intellectual property.
              Hotel names, logos, and trademarks belong to their respective owners.
              Provider names and branding belong to their respective companies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">7. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              SV Booking shall not be liable for any indirect, incidental, or consequential
              damages arising from use of the service. Our total liability is limited to zero,
              as this is a free service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">8. Changes</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update these terms at any time. Continued use after changes constitutes
              acceptance of the updated terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
