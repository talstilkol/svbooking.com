import fs from 'node:fs';

const failures = [];

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const agentUtils = read('lib/agent-utils.js');
assert(agentUtils.includes('AGENT_REQUIREMENTS'), 'agent readiness metadata is missing');
assert(agentUtils.includes('getAllAgentReadiness'), 'agent readiness lookup is missing');

const statusRoute = read('app/api/agents/auto/status/route.js');
assert(statusRoute.includes('getAllAgentReadiness'), 'agent status API does not include readiness');
assert(statusRoute.includes('readiness'), 'agent status API response does not expose readiness');

const orchestrator = read('app/api/agents/auto/orchestrate/route.js');
assert(!orchestrator.includes('addAndPersistHotel'), 'orchestrator must not persist hotels directly');
assert(!orchestrator.includes('autoMergedHotels'), 'orchestrator still reports auto-merged hotels');
assert(orchestrator.includes('admin-review-required'), 'orchestrator must report admin review catalog promotion');

const priceCache = read('lib/price-cache.js');
assert(priceCache.includes('getHotelRates'), 'price cache must use the multi-provider registry for dated rates');
assert(!priceCache.includes("getRates, getHeatmap"), 'price cache still imports Xotelo rates directly');
assert(priceCache.includes('freshness'), 'price cache must expose freshness metadata');

const priceCacheAgent = read('app/api/agents/auto/price-cache/route.js');
assert(priceCacheAgent.includes('getCachedRates'), 'price-cache agent must prewarm dated provider rates');
assert(priceCacheAgent.includes('active-price-alert'), 'price-cache agent must prioritize active alert dates');
assert(priceCacheAgent.includes('catalog-priority'), 'price-cache agent must include catalog-priority dated-rate work');
assert(priceCacheAgent.includes('heatmap-price-sources'), 'price-cache agent must keep heatmaps labeled as price sources');
assert(priceCacheAgent.includes('Cache-Control'), 'price-cache agent responses must be no-store');

for (const path of [
  'app/api/agents/auto/discovery/route.js',
  'app/api/agents/auto/bulk-discovery/route.js',
  'app/api/agents/auto/osm-scanner/route.js',
  'app/api/agents/auto/xotelo-discovery/route.js',
]) {
  const content = read(path);
  assert(content.includes('upsertCandidates'), `${path} must write to the candidate review queue`);
}

const randomMatches = [];
for (const path of fs.readdirSync('lib/utils')) {
  const content = read(`lib/utils/${path}`);
  if (/Math\.random|crypto\.randomUUID/.test(content)) randomMatches.push(`lib/utils/${path}`);
}
assert(randomMatches.length === 0, `randomness found in utility files: ${randomMatches.join(', ')}`);

if (failures.length > 0) {
  console.error('Agent audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Agent audit passed');
