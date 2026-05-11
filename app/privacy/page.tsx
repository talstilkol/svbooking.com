import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'SV Booking privacy policy — how we handle your data, what we collect, and your rights.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: May 11, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800">1. Overview</h2>
            <p className="text-slate-600 leading-relaxed">
              SV Booking (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy.
              This policy explains what data we collect, how we use it, and your rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">2. Data We Collect</h2>
            <p className="text-slate-600 leading-relaxed">
              <strong>We collect minimal data.</strong> SV Booking is designed to work without
              user accounts or personal information.
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>Hotel searches and comparisons (used only to fetch live prices)</li>
              <li>Favorites, trips, and preferences (stored locally in your browser via localStorage)</li>
              <li>Anonymous usage analytics (page views, feature usage)</li>
              <li>No personal data, email addresses, or payment information is collected</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">3. Local Storage</h2>
            <p className="text-slate-600 leading-relaxed">
              Your favorites, saved trips, recently viewed hotels, and price alerts are stored
              entirely on your device using browser localStorage. We never transmit this data
              to our servers. Clearing your browser data will remove this information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">4. Third-Party Services</h2>
            <p className="text-slate-600 leading-relaxed">
              We use third-party APIs to fetch hotel pricing data:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>Xotelo API — for real-time hotel price comparison data</li>
              <li>Unsplash — for hotel and city images</li>
              <li>Vercel — for hosting and analytics</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-2">
              When you click through to book on a provider&apos;s website (Booking.com, Expedia, etc.),
              their privacy policies apply.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">5. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              We use only essential cookies for site functionality. No third-party tracking
              cookies are used. You can manage cookie preferences through our cookie consent banner.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">6. Your Rights</h2>
            <p className="text-slate-600 leading-relaxed">
              Since we don&apos;t collect personal data, there&apos;s nothing to delete or export.
              Your locally stored data can be cleared by clearing your browser&apos;s localStorage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">7. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For privacy-related questions, please reach out via our contact page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
