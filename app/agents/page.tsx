'use client';

import Link from 'next/link';
import AgentDashboard from '@/components/AgentDashboard';

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="bg-linear-to-r from-purple-700 to-pink-600 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-white/80 text-sm hover:text-white mb-4 inline-block">&larr; Home</Link>
          <h1 className="text-4xl font-bold mb-2">AI Agents Dashboard</h1>
          <p className="text-lg opacity-90">
            Automated deal scanning, health monitoring, and personalized recommendations
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <AgentDashboard />
      </div>
    </div>
  );
}
