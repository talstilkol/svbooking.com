'use client';

import Link from 'next/link';
import AgentDashboard from '@/components/AgentDashboard';
import { useLocale } from '@/components/LocaleProvider';

export default function AgentsPage() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-linear-to-r from-purple-700 to-pink-600 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-white/80 text-sm hover:text-white mb-4 inline-block">&larr; {t('agentsHome')}</Link>
          <h1 className="text-4xl font-bold mb-2">{t('agentsTitle')}</h1>
          <p className="text-lg opacity-90">
            {t('agentsSubtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <AgentDashboard />
      </div>
    </div>
  );
}
