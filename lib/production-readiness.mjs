import { buildCatalogMediaQuality } from './catalog-media-quality.js';
import {
  areLaunchServicesReady,
  buildLaunchServiceBlockers,
  summarizeLaunchServices,
} from './launch-services.mjs';
import {
  KINDE_REQUIRED_ENV,
  OPTIONAL_ENV,
  PARTNER_PROVIDER_ENV,
  REQUIRED_ENV,
  summarizeEnv,
  summarizePartnerProviderGroups,
} from './env-config.mjs';

export {
  KINDE_REQUIRED_ENV,
  MIN_SECRET_ENV_LENGTH,
  OPTIONAL_ENV,
  PARTNER_PROVIDER_ENV,
  PARTNER_PROVIDER_GROUPS,
  PLACEHOLDER_ENV_VALUES,
  REQUIRED_ENV,
  SENSITIVE_ENV_NAME_PATTERN,
  STRICT_LAUNCH_ENV,
  URL_ENV_NAME_PATTERN,
  getConfiguredPartnerProviderIds,
  getEnvConfigurationIssue,
  isEnvConfigured,
  isKindeConfigured,
  normalizedEnvValue,
  summarizeEnv,
  summarizePartnerProviderGroups,
} from './env-config.mjs';

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
  const launchServices = summarizeLaunchServices(env);
  const launchServicesReady = areLaunchServicesReady(launchServices);

  return {
    productionReady: missingRequired.length === 0 &&
      missingKinde.length === 0 &&
      configuredPricing.length > 0 &&
      catalogMediaReady &&
      launchServicesReady,
    strict,
    required,
    kinde,
    pricingProviders,
    pricingProviderEnv,
    optional,
    launchServices,
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
      ...buildLaunchServiceBlockers(launchServices),
    ],
    notes: [
      'Values are intentionally not printed.',
      'Xotelo can still serve as a no-auth baseline provider, but production scale requires durable KV, Kinde auth, one complete partner pricing provider env group, approved catalog media, licensed reviews, alert delivery, ops delivery, and push keys.',
    ],
  };
}
