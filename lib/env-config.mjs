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
  'GOOGLE_PLACES_API_KEY',
  'ADMIN_USER_IDS',
  'ADMIN_EMAILS',
];

export const STRICT_LAUNCH_ENV = [
  'PRICE_ALERT_WEBHOOK_URL',
  'PRICE_ALERT_WEBHOOK_SECRET',
  'PRICE_ALERT_UNSUBSCRIBE_SECRET',
  'OPS_ALERT_WEBHOOK_URL',
  'OPS_ALERT_WEBHOOK_SECRET',
  'NEXT_PUBLIC_PUSH_PUBLIC_KEY',
  'PUSH_PRIVATE_KEY',
  'REVIEWS_PROVIDER_NAME',
  'REVIEWS_PROVIDER_LICENSED',
  'GOOGLE_PLACES_API_KEY',
];

export const PARTNER_PROVIDER_ENV = [...new Set(PARTNER_PROVIDER_GROUPS.flatMap((provider) => provider.env))];
export const MIN_SECRET_ENV_LENGTH = 16;
export const PLACEHOLDER_ENV_VALUES = new Set([
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
export const SENSITIVE_ENV_NAME_PATTERN = /(SECRET|TOKEN|API_KEY|APIKEY|_KEY|CLIENT_ID)$/u;
export const URL_ENV_NAME_PATTERN = /(_URL|_SITE_URL|_REDIRECT_URL)$/u;

export function normalizedEnvValue(env, name) {
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

export function isEnvConfigured(env, name) {
  return !getEnvConfigurationIssue(env, name);
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
