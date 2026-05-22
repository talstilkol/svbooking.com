import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'SV Booking privacy policy — how we handle your data, what we collect, and your rights.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: May 14, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800">1. Overview</h2>
            <p className="text-slate-600 leading-relaxed">
              SV Booking (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is built around data minimization:
              we only show verified travel data when a source exists, and we mark unavailable
              fields as unavailable instead of generating personal, review, or pricing claims.
              This policy explains what data is stored, how it is used, and your controls.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">2. Data We Collect</h2>
            <p className="text-slate-600 leading-relaxed">
              <strong>We collect minimal data.</strong> Most browsing and saved travel planning can
              work on your local device. If you sign in, account-scoped records can also be stored
              so they can sync across devices.
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>Hotel searches and comparisons needed to return provider prices and availability states.</li>
              <li>Favorites, trips, preferences, and price alerts stored locally and, when signed in, in account-scoped storage.</li>
              <li>Provider click and price mismatch records used to measure price accuracy.</li>
              <li>Operational logs use redacted details or deterministic fingerprints; raw secrets are not stored in these records.</li>
              <li>No payment card data is collected or processed by SV Booking.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">3. Local and Account Storage</h2>
            <p className="text-slate-600 leading-relaxed">
              Local favorites, saved trips, recent searches, and price-alert drafts may be stored
              in browser storage. Signed-in users can also store favorites, trips,
              preferences, and price alerts through authenticated no-store APIs. You can export
              or clear this app-owned account data from the profile data controls, which call
              <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">/api/me/data</code>.
              Clearing your browser data removes local-device records; using the account delete
              control removes app-owned server records and related fingerprinted alert events.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">4. Third-Party Services</h2>
            <p className="text-slate-600 leading-relaxed">
              We can use third-party services to authenticate users, host the app, fetch provider
              prices, and enrich travel context when configured:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>Kinde — authentication when sign-in is enabled.</li>
              <li>Upstash Redis or compatible KV — durable account, alert, cache, and operations storage when configured.</li>
              <li>Hotel pricing providers such as Xotelo or configured partner providers — provider-returned hotel price comparison data.</li>
              <li>Vercel or equivalent hosting infrastructure — application hosting.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-2">
              When you click through to book on a provider&apos;s website (Booking.com, Expedia, etc.),
              their privacy policies apply.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">5. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              Authentication cookies are used when you sign in. Local device features use
              browser storage. We do not use cookie data to invent or infer hotel reviews, prices,
              savings, or availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">6. Your Rights</h2>
            <p className="text-slate-600 leading-relaxed">
              You can export app-owned local and signed-in account data from the profile data
              controls. You can also clear local records and delete app-owned account records
              there. The account-data deletion flow removes favorites, trips, preferences,
              price alerts, the price-alert user index entry, and fingerprinted price-alert
              events held by SV Booking. Closing the external authentication account may require
              the auth-provider account lifecycle or a support request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">7. Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              The public
              <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">/api/data-retention</code>
              endpoint lists current operational retention windows. Examples include 30 days
              for price-alert trigger events, 90 days for price accuracy and admin audit events,
              and shorter TTLs for provider trends and rate caches. User-owned records persist
              until user action or account-retention rules apply.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800">8. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For privacy-related questions, please reach out via our contact page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
