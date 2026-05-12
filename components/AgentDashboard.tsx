'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useFavorites, useTrips } from '@/lib/useLocalStorage';
import DealCard from './DealCard';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error';
  checkedAt: string;
  checks: Record<string, { ok: boolean; latencyMs: number; error?: string }>;
  suggestions: string[];
}

interface TopDeal {
  hotel: { hotelKey: string; name: string; city: string; country: string; image: string };
  checkIn: string;
  checkOut: string;
  price: number;
  pricePerNight: number;
  provider: string;
  urgency: string;
  savingsPct: number;
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  hotel: { hotelKey: string; name: string; city: string; country: string; image: string };
  action: { label: string; href: string };
  priority: string;
}

interface AvailabilityResult {
  provider: string;
  url: string;
  status: number;
  available: boolean;
  note: string;
}

interface AvailabilityCheck {
  hotel: { name: string; city: string; country: string };
  dates: { checkIn: string; checkOut: string };
  results: AvailabilityResult[];
  summary: string;
  bookingLinks: { provider: string; url: string }[];
}

interface ProviderInfo {
  id: string;
  name: string;
  priority: number;
  configured: boolean;
  available: boolean;
  monthlyLimit: number;
  dailyLimit: number;
  callsThisMonth: number;
  callsToday: number;
  errors: number;
  consecutiveErrors: number;
  quotaUsedPct: number;
  lastSuccess: string | null;
  lastError: { message: string; at: string } | null;
}

interface BackgroundAgent {
  name: string;
  label: string;
  icon: string;
  desc: string;
  status: 'completed' | 'running' | 'error' | 'never-run';
  startedAt?: string;
  completedAt?: string;
  elapsedMs?: number;
  error?: string;
  result?: Record<string, unknown>;
  recentRuns?: Array<{ status: string; startedAt: string; elapsedMs: number }>;
}

function formatTimestamp(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AgentDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [topDeals, setTopDeals] = useState<TopDeal[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [availability, setAvailability] = useState<AvailabilityCheck | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [availHotel, setAvailHotel] = useState('');
  const [availCheckIn, setAvailCheckIn] = useState('');
  const [availCheckOut, setAvailCheckOut] = useState('');
  const [hotels, setHotels] = useState<{ hotelKey: string; name: string; city: string }[]>([]);
  const [dealsScannedAt, setDealsScannedAt] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [bgAgents, setBgAgents] = useState<BackgroundAgent[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState({ health: false, deals: false, recs: false, providers: false });
  const { favorites } = useFavorites();
  const { trips } = useTrips();

  const fetchHealth = async () => {
    setLoading((l) => ({ ...l, health: true }));
    try {
      const res = await fetch('/api/agents/health-check');
      const data = await res.json();
      setHealth(data);
    } catch { setHealth(null); }
    setLoading((l) => ({ ...l, health: false }));
  };

  const fetchDeals = async () => {
    setLoading((l) => ({ ...l, deals: true }));
    try {
      const res = await fetch('/api/agents/deals?limit=6');
      const data = await res.json();
      setTopDeals(data.topDeals || []);
      if (data.scannedAt) setDealsScannedAt(data.scannedAt);
    } catch { setTopDeals([]); }
    setLoading((l) => ({ ...l, deals: false }));
  };

  const fetchRecommendations = async () => {
    if (favorites.length === 0 && trips.length === 0) return;
    setLoading((l) => ({ ...l, recs: true }));
    try {
      const res = await fetch('/api/agents/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites, trips }),
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch { setRecommendations([]); }
    setLoading((l) => ({ ...l, recs: false }));
  };

  const fetchProviders = async () => {
    setLoading((l) => ({ ...l, providers: true }));
    try {
      const res = await fetch('/api/agents/providers');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch { setProviders([]); }
    setLoading((l) => ({ ...l, providers: false }));
  };

  const resetProviderBreaker = async (providerId: string) => {
    await fetch('/api/agents/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset', providerId }),
    });
    fetchProviders();
  };

  const fetchBgAgents = async () => {
    setBgLoading(true);
    try {
      const res = await fetch('/api/agents/auto/status');
      const data = await res.json();
      setBgAgents(data.agents || []);
    } catch { setBgAgents([]); }
    setBgLoading(false);
  };

  const triggerAgent = async (agentName: string) => {
    setRunningAgent(agentName);
    try {
      await fetch(`/api/agents/auto/${agentName}`);
    } catch { /* ignore */ }
    setRunningAgent(null);
    fetchBgAgents();
  };

  const fetchHotels = async () => {
    try {
      const res = await fetch('/api/compare');
      const data = await res.json();
      setHotels((data.hotels || []).map((h: any) => ({ hotelKey: h.hotelKey, name: h.name, city: h.city })));
    } catch {}
  };

  const checkAvailability = async () => {
    if (!availHotel || !availCheckIn || !availCheckOut) return;
    setAvailLoading(true);
    setAvailability(null);
    try {
      const params = new URLSearchParams({ hotelKey: availHotel, checkIn: availCheckIn, checkOut: availCheckOut });
      const res = await fetch(`/api/agents/availability?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAvailability(data);
    } catch {}
    setAvailLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    fetchDeals();
    fetchHotels();
    fetchProviders();
    fetchBgAgents();
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [favorites.length, trips.length]);

  const statusColor = health?.status === 'healthy' ? 'bg-emerald-500' : health?.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-8">
      {/* Health Status */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusColor} ${!health ? 'animate-pulse' : ''}`} />
            <h3 className="font-semibold text-zinc-900">System Health</h3>
          </div>
          <div className="flex items-center gap-3">
            {health?.checkedAt && (
              <span className="text-xs text-zinc-400">Last checked: {formatTimestamp(health.checkedAt)}</span>
            )}
            <button
              onClick={fetchHealth}
              disabled={loading.health}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {loading.health ? 'Checking...' : 'Refresh'}
            </button>
          </div>
        </div>
        {health && (
          <div className="space-y-2">
            {Object.entries(health.checks).map(([key, check]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">{key}</span>
                <span className={check.ok ? 'text-emerald-600' : 'text-red-500'}>
                  {check.ok ? `OK${check.latencyMs ? ` (${check.latencyMs}ms)` : ''}` : check.error || 'Failed'}
                </span>
              </div>
            ))}
            {health.suggestions.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded text-sm text-amber-800">
                {health.suggestions.map((s, i) => <p key={i}>{s}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pricing Providers */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900">Pricing Providers</h3>
          <button
            onClick={fetchProviders}
            disabled={loading.providers}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {loading.providers ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {providers.length > 0 ? (
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  !p.configured ? 'bg-zinc-300' : p.available ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600">
                      #{p.priority}
                    </span>
                    {!p.configured && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-500">Not configured</span>
                    )}
                    {p.consecutiveErrors >= 5 && (
                      <button
                        onClick={() => resetProviderBreaker(p.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        Circuit open — Reset
                      </button>
                    )}
                  </div>
                  {p.configured && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span>Today: {p.callsToday}{p.dailyLimit > 0 ? `/${p.dailyLimit}` : ''}</span>
                      <span>Month: {p.callsThisMonth}{p.monthlyLimit > 0 ? `/${p.monthlyLimit}` : ''}</span>
                      {p.errors > 0 && <span className="text-amber-600">Errors: {p.errors}</span>}
                    </div>
                  )}
                </div>
                {p.configured && p.monthlyLimit > 0 && (
                  <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.quotaUsedPct > 80 ? 'bg-red-500' : p.quotaUsedPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, p.quotaUsedPct)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Loading providers...</p>
        )}
      </div>

      {/* Background Agents */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900">Background Agents</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBgAgents}
              disabled={bgLoading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {bgLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => triggerAgent('orchestrate')}
              disabled={runningAgent !== null}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {runningAgent === 'orchestrate' ? 'Running...' : 'Run All'}
            </button>
          </div>
        </div>
        {bgAgents.length > 0 ? (
          <div className="space-y-3">
            {bgAgents.map((agent) => (
              <div key={agent.name} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                <span className="text-xl">{agent.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">{agent.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      agent.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      agent.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      agent.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-zinc-200 text-zinc-500'
                    }`}>
                      {agent.status === 'never-run' ? 'Never run' : agent.status}
                    </span>
                    {agent.elapsedMs != null && agent.status !== 'never-run' && (
                      <span className="text-[10px] text-zinc-400">
                        {agent.elapsedMs < 1000 ? `${agent.elapsedMs}ms` : `${(agent.elapsedMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{agent.desc}</p>
                  {agent.completedAt && (
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Last run: {formatTimestamp(agent.completedAt)}
                    </p>
                  )}
                  {agent.error && (
                    <p className="text-[10px] text-red-500 mt-0.5 truncate">Error: {agent.error}</p>
                  )}
                </div>
                {agent.name !== 'orchestrator' && (
                  <button
                    onClick={() => triggerAgent(agent.name)}
                    disabled={runningAgent !== null}
                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                  >
                    {runningAgent === agent.name ? 'Running...' : 'Run'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Loading agents...</p>
        )}
      </div>

      {/* Top Deals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-zinc-900">Top Deals Found</h3>
          <div className="flex items-center gap-3">
            {dealsScannedAt && (
              <span className="text-xs text-zinc-400">Last scanned: {formatTimestamp(dealsScannedAt)}</span>
            )}
            <button
              onClick={fetchDeals}
              disabled={loading.deals}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {loading.deals ? 'Scanning...' : 'Scan Again'}
            </button>
          </div>
        </div>
        {loading.deals ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-500 mt-2">Scanning hotels for deals...</p>
          </div>
        ) : topDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topDeals.map((deal, i) => (
              <DealCard
                key={i}
                deal={{
                  hotel: deal.hotel,
                  bestPrice: deal.price,
                  pricePerNight: deal.pricePerNight,
                  bestProvider: deal.provider,
                  checkIn: deal.checkIn,
                  checkOut: deal.checkOut,
                  nights: 2,
                  currency: 'USD',
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-4">No deals scanned yet.</p>
        )}
      </div>

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-zinc-900 mb-4">
            Personalized Recommendations
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-lg"
              >
                <Image
                  src={rec.hotel.image}
                  alt={rec.hotel.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {rec.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="font-medium text-zinc-900 text-sm mt-1">{rec.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{rec.description}</p>
                </div>
                <a
                  href={rec.action.href}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  {rec.action.label}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability Checker Agent */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <h3 className="font-semibold text-zinc-900 mb-4">Hotel Availability Agent</h3>
        <p className="text-sm text-zinc-500 mb-4">
          Checks booking sites directly (no API) to verify a hotel is available for your dates.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <select
            aria-label="Select hotel"
            value={availHotel}
            onChange={(e) => setAvailHotel(e.target.value)}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select hotel...</option>
            {hotels.map((h) => (
              <option key={h.hotelKey} value={h.hotelKey}>{h.name} ({h.city})</option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Check-in date"
            value={availCheckIn}
            onChange={(e) => setAvailCheckIn(e.target.value)}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            aria-label="Check-out date"
            value={availCheckOut}
            min={availCheckIn}
            onChange={(e) => setAvailCheckOut(e.target.value)}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={checkAvailability}
            disabled={availLoading || !availHotel || !availCheckIn || !availCheckOut}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {availLoading ? 'Checking...' : 'Check Availability'}
          </button>
        </div>

        {availability && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-700">{availability.summary}</p>
            <div className="space-y-2">
              {availability.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-zinc-50 rounded text-sm">
                  <span className="font-medium text-zinc-700">{r.provider}</span>
                  <span className={r.available ? 'text-emerald-600' : 'text-zinc-400'}>
                    {r.available ? 'Reachable' : r.note}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-200">
              <p className="text-xs text-zinc-500 mb-2">Direct booking links:</p>
              <div className="flex flex-wrap gap-2">
                {availability.bookingLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg hover:bg-blue-100"
                  >
                    {link.provider} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Sources Overview */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <h3 className="font-semibold text-zinc-900 mb-4">Free Data Sources (No Auth Required)</h3>
        <p className="text-sm text-zinc-500 mb-4">
          All external data sources used by SVBooking. Every source is free and requires no API key.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'Xotelo', desc: 'Hotel pricing from 8+ providers', type: 'Pricing', icon: '💰', endpoint: '/api/compare' },
            { name: 'Open-Meteo', desc: '7-day weather forecast', type: 'Weather', icon: '🌤️', endpoint: '/api/weather' },
            { name: 'OpenStreetMap Overpass', desc: 'Hotel discovery (1,100+ in Paris alone)', type: 'Discovery', icon: '🗺️', endpoint: '/api/catalog/discover-osm' },
            { name: 'Nominatim', desc: 'Hotel geocoding & address lookup', type: 'Geocoding', icon: '📍', endpoint: '/api/catalog/discover-osm?source=nominatim' },
            { name: 'Wikidata SPARQL', desc: 'TripAdvisor/Booking IDs crossref', type: 'Enrichment', icon: '🔗', endpoint: '/api/catalog/discover' },
            { name: 'Wikipedia', desc: 'City descriptions & images', type: 'Content', icon: '📖', endpoint: '/api/city-info' },
            { name: 'Open Exchange Rates', desc: '166 currencies, daily updates', type: 'Currency', icon: '💱', endpoint: '/api/exchange-rates' },
            { name: 'IP-API', desc: 'Visitor geolocation & currency', type: 'Geolocation', icon: '🌐', endpoint: '/api/geo' },
            { name: 'Nager.Date', desc: 'Public holidays for 100+ countries', type: 'Holidays', icon: '📅', endpoint: '/api/holidays' },
            { name: 'REST Countries', desc: 'Country metadata, currencies, languages', type: 'Reference', icon: '🏳️', endpoint: '' },
          ].map((source) => (
            <div
              key={source.name}
              className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg"
            >
              <span className="text-xl mt-0.5">{source.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900">{source.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{source.type}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{source.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {favorites.length === 0 && trips.length === 0 && (
        <div className="text-center py-6 text-zinc-500">
          <p>Add favorites or save trips to get personalized recommendations.</p>
        </div>
      )}
    </div>
  );
}
