import { buildCatalogMediaQuality } from './catalog-media-quality.js';

export const REQUIRED_ENV = [
  'ADMIN_API_SECRET',
  'CRON_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

export const KINDE_REQUIRED_ENV = [
  'KINDE_CLIENT_ID',
  'KINDE_CLIENT_SECRET',
  'KINDE_ISSUER_URL',
  'KINDE_SITE_URL',
  'KINDE_POST_LOGOUT_REDIRECT_URL',
  'KINDE_POST_LOGIN_REDIRECT_URL',
];

export const PARTNER_PROVIDER_GROUPS = [
  { id: 'rapidapi', name: 'RapidAPI', env: ['RAPIDAPI_KEY'] },
  { id: 'serpapi', name: 'SerpAPI', env: ['SERPAPI_KEY'] },
  { id: 'makcorps', name: 'MakCorps', env: ['MAKCORPS_API_KEY'] },
  { id: 'amadeus', name: 'Amadeus', env: ['AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET'] },
];

export const OPTIONAL_ENV = [
  'TICKETMASTER_API_KEY',
  'OPENTRIPMAP_API_KEY',
  'PRICE_ALERT_WEBHOOK_URL',
  'PRICE_ALERT_WEBHOOK_SECRET',
  'PRICE_ALERT_UNSUBSCRIBE_SECRET',
  'OPS_ALERT_WEBHOOK_URL',
  'OPS_ALERT_WEBHOOK_SECRET',
  'NEXT_PUBLIC_PUSH_PUBLIC_KEY',
  'PUSH_PRIVATE_KEY',
  'REVIEWS_PROVIDER_NAME',
  'REVIEWS_PROVIDER_LICENSED',
  'ADMIN_USER_IDS',
  'ADMIN_EMAILS',
];

const PARTNER_PROVIDER_ENV = [...new Set(PARTNER_PROVIDER_GROUPS.flatMap((provider) => provider.env))];
const MIN_SECRET_ENV_LENGTH = 16;
const PLACEHOLDER_ENV_VALUES = new Set([
  'changeme',
  'change-me',
  'replace-me',
  'placeholder',
  'todo',
  'tbd',
  'demo',
  'sample',
  'test',
  'example',
  'example-value',
  'secret',
  'token',
  'key',
  'password',
  'none',
  'null',
  'undefined',
]);
const SENSITIVE_ENV_NAME_PATTERN = /(SECRET|TOKEN|API_KEY|APIKEY|_KEY|CLIENT_ID)$/u;
const URL_ENV_NAME_PATTERN = /(_URL|_SITE_URL|_REDIRECT_URL)$/u;

export function isEnvConfigured(env, name) {
  return !getEnvConfigurationIssue(env, name);
}

function normalizedEnvValue(env, name) {
  return String(env?.[name] || '').trim();
}

function isPlaceholderEnvValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const compact = normalized.replace(/[\s_]+/gu, '-');
  return (
    PLACEHOLDER_ENV_VALUES.has(compact) ||
    compact.startsWith('your-') ||
    compact.startsWith('<') ||
    compact.endsWith('>') ||
    compact.includes('changeme') ||
    compact.includes('replace-me') ||
    normalized.includes('example.com') ||
    normalized.includes('.invalid') ||
    normalized.includes('localhost')
  );
}

function isHttpsEnvUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getEnvConfigurationIssue(env, name) {
  const value = normalizedEnvValue(env, name);
  if (!value) return 'missing';
  if (isPlaceholderEnvValue(value)) return 'placeholder value is not allowed';
  if (URL_ENV_NAME_PATTERN.test(name) && !isHttpsEnvUrl(value)) return 'must be an HTTPS URL without credentials';
  if (SENSITIVE_ENV_NAME_PATTERN.test(name) && value.length < MIN_SECRET_ENV_LENGTH) {
    return `must be at least ${MIN_SECRET_ENV_LENGTH} characters`;
  }
  return null;
}

export function summarizeEnv(names, env) {
  return names.map((name) => {
    const issue = getEnvConfigurationIssue(env, name);
    return {
      name,
      configured: !issue,
      ...(issue && issue !== 'missing' ? { issue } : {}),
    };
  });
}

export function summarizePartnerProviderGroups(env) {
  return PARTNER_PROVIDER_GROUPS.map((provider) => {
    const entries = summarizeEnv(provider.env, env);
    const missing = entries.filter((entry) => !entry.configured).map((entry) => entry.name);
    const invalid = entries
      .filter((entry) => !entry.configured && entry.issue)
      .map((entry) => ({ name: entry.name, issue: entry.issue }));
    return {
      name: provider.name,
      requiredEnv: provider.env,
      configured: missing.length === 0,
      missing,
      ...(invalid.length > 0 ? { invalid } : {}),
    };
  });
}

export function getConfiguredPartnerProviderIds(env) {
  return PARTNER_PROVIDER_GROUPS
    .filter((provider) => provider.env.every((name) => isEnvConfigured(env, name)))
    .map((provider) => provider.id);
}

export function isKindeConfigured(env) {
  return KINDE_REQUIRED_ENV.every((name) => isEnvConfigured(env, name));
}

export function buildProductionReadinessSummary({
  env = process.env,
  strict = env.PRODUCTION_READINESS_STRICT === '1',
  catalogMediaQuality = buildCatalogMediaQuality(),
} = {}) {
  const required = summarizeEnv(REQUIRED_ENV, env);
  const kinde = summarizeEnv(KINDE_REQUIRED_ENV, env);
  const pricingProviderEnv = summarizeEnv(PARTNER_PROVIDER_ENV, env);
  const pricingProviders = summarizePartnerProviderGroups(env);
  const optional = summarizeEnv(OPTIONAL_ENV, env);
  const missingRequired = required.filter((entry) => !entry.configured).map((entry) => entry.name);
  const missingKinde = kinde.filter((entry) => !entry.configured).map((entry) => entry.name);
  const configuredPricing = pricingProviders.filter((entry) => entry.configured).map((entry) => entry.name);
  const catalogMediaReady = catalogMediaQuality?.status === 'healthy';

  return {
    productionReady: missingRequired.length === 0 &&
      missingKinde.length === 0 &&
      configuredPricing.length > 0 &&
      catalogMediaReady,
    strict,
    required,
    kinde,
    pricingProviders,
    pricingProviderEnv,
    optional,
    catalogMediaQuality: catalogMediaQuality ? {
      status: catalogMediaQuality.status,
      score: catalogMediaQuality.score,
      current: catalogMediaQuality.current,
      target: catalogMediaQuality.target,
      blockers: catalogMediaQuality.blockers,
      nextActions: catalogMediaQuality.nextActions,
    } : null,
    blockers: [
      ...missingRequired.map((name) => {
        const entry = required.find((item) => item.name === name);
        return entry?.issue ? `Invalid required env: ${name} (${entry.issue})` : `Missing required env: ${name}`;
      }),
      ...missingKinde.map((name) => {
        const entry = kinde.find((item) => item.name === name);
        return entry?.issue ? `Invalid Kinde env: ${name} (${entry.issue})` : `Missing Kinde env: ${name}`;
      }),
      ...pricingProviders.flatMap((provider) =>
        (provider.invalid || []).map((entry) => `Invalid ${provider.name} env: ${entry.name} (${entry.issue})`)
      ),
      ...(configuredPricing.length === 0 ? ['No complete paid/partner pricing provider env group is configured'] : []),
      ...(!catalogMediaReady
        ? ['Catalog media quality is not launch-ready', ...((catalogMediaQuality?.blockers || []).map((blocker) => `Catalog media: ${blocker}`))]
        : []),
    ],
    notes: [
      'Values are intentionally not printed.',
      'Xotelo can still serve as a no-auth baseline provider, but production scale requires durable KV, Kinde auth, one complete partner pricing provider env group, and approved catalog media.',
    ],
  };
}
