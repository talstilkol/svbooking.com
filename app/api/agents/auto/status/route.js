// Agent Status API — Returns status of all background agents.
// Used by the AgentDashboard to display agent health and run history.

import { getAllAgentStatuses, getAgentHistory, AGENT_NAMES } from '@/lib/agent-utils';

const AGENT_DESCRIPTIONS = {
  [AGENT_NAMES.DISCOVERY]:      { label: 'Hotel Discovery',   icon: '🔍', desc: 'Discovers new hotels via OSM + Wikidata' },
  [AGENT_NAMES.PRICE_CACHE]:    { label: 'Price Cache',       icon: '💰', desc: 'Pre-warms price cache for instant searches' },
  [AGENT_NAMES.DEAL_SCANNER]:   { label: 'Deal Scanner',      icon: '🏷️', desc: 'Scans all hotels for best deals' },
  [AGENT_NAMES.ENRICHMENT]:     { label: 'Enrichment',        icon: '📖', desc: 'Enriches data with Wikipedia & Wikidata' },
  [AGENT_NAMES.HEALTH_MONITOR]: { label: 'Health Monitor',    icon: '🩺', desc: 'Checks data sources & auto-resets breakers' },
  [AGENT_NAMES.ORCHESTRATOR]:   { label: 'Orchestrator',      icon: '🎯', desc: 'Runs all agents in sequence (cron)' },
};

export async function GET() {
  try {
    const statuses = await getAllAgentStatuses();

    const agents = await Promise.all(
      Object.entries(statuses).map(async ([name, status]) => {
        const meta = AGENT_DESCRIPTIONS[name] || { label: name, icon: '⚙️', desc: '' };
        let history = [];
        try {
          history = await getAgentHistory(name);
        } catch { /* non-critical */ }

        return {
          name,
          ...meta,
          ...status,
          recentRuns: history.slice(0, 5),
        };
      })
    );

    return Response.json({
      agents,
      generatedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return Response.json(
      { error: err.message, agents: [] },
      { status: 500 }
    );
  }
}
