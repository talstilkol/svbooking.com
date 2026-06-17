import { buildCatalogMediaActionLedger } from '../lib/catalog-media-quality.js';
import { buildProductionReadinessSummary } from '../lib/production-readiness.mjs';

const FORMAT_VALUES = new Set(['text', 'json']);

function argValue(name, fallback = null) {
  const exact = `--${name}`;
  const prefixed = `${exact}=`;
  const index = process.argv.indexOf(exact);
  if (index !== -1) return process.argv[index + 1] || fallback;
  const match = process.argv.find((arg) => arg.startsWith(prefixed));
  return match ? match.slice(prefixed.length) : fallback;
}

function parseLimit(fallback) {
  const value = Number.parseInt(argValue('limit', String(fallback)), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function names(entries) {
  return entries.filter((entry) => !entry.configured).map((entry) => entry.name);
}

function configuredNames(entries) {
  return entries.filter((entry) => entry.configured).map((entry) => entry.name);
}

function serviceStatus(summary) {
  return {
    reviews: summary.launchServices.reviews.configured ? 'configured' : 'not-configured',
    priceAlerts: summary.launchServices.priceAlerts.deliveryConfigured &&
      summary.launchServices.priceAlerts.unsubscribeConfigured
      ? 'configured'
      : 'not-configured',
    opsAlerts: summary.launchServices.opsAlerts.deliveryConfigured ? 'configured' : 'not-configured',
    push: summary.launchServices.push.configured ? 'configured' : 'not-configured',
  };
}

function buildReport({ blockerLimit = 12 } = {}) {
  const readiness = buildProductionReadinessSummary({ env: process.env });
  const mediaLedger = buildCatalogMediaActionLedger();
  const priorityMedia = mediaLedger.items.filter((item) => item.reasons.includes('reused-across-cities'));

  return {
    productionReady: readiness.productionReady,
    missingRequiredEnv: names(readiness.required),
    missingKindeEnv: names(readiness.kinde),
    configuredPricingProviders: configuredNames(readiness.pricingProviders),
    launchServices: serviceStatus(readiness),
    catalogMedia: {
      status: readiness.catalogMediaQuality?.status || 'unknown/unavailable',
      score: readiness.catalogMediaQuality?.score ?? null,
      totalActions: mediaLedger.summary.totalItems,
      totalHotelReferences: mediaLedger.summary.totalHotels,
      unapprovedImageSources: mediaLedger.summary.unapprovedImageSources,
      reusedImageSources: mediaLedger.summary.reusedImageSources,
      priorityReusedSources: priorityMedia.map((item) => ({
        sourceUrl: item.sourceUrl,
        cityCount: item.cityCount,
        hotelCount: item.hotelCount,
        cities: item.cities,
      })),
    },
    blockerCount: readiness.blockers.length,
    topBlockers: readiness.blockers.slice(0, blockerLimit),
    nextCommands: [
      'npm run catalog:media:ledger:summary',
      'npm run audit:production',
      'npm run audit:production:strict',
      'SITE_URL=https://your-deployment.example npm run smoke:deployment',
    ],
  };
}

function printText(report) {
  console.log('SV Booking launch readiness report');
  console.log(`productionReady: ${report.productionReady}`);
  console.log(`missingRequiredEnv: ${report.missingRequiredEnv.length ? report.missingRequiredEnv.join(', ') : 'none'}`);
  console.log(`missingKindeEnv: ${report.missingKindeEnv.length ? report.missingKindeEnv.join(', ') : 'none'}`);
  console.log(`configuredPricingProviders: ${report.configuredPricingProviders.length ? report.configuredPricingProviders.join(', ') : 'none'}`);
  console.log(`launchServices: reviews=${report.launchServices.reviews}, priceAlerts=${report.launchServices.priceAlerts}, opsAlerts=${report.launchServices.opsAlerts}, push=${report.launchServices.push}`);
  console.log(`catalogMedia: status=${report.catalogMedia.status}, actions=${report.catalogMedia.totalActions}, unapproved=${report.catalogMedia.unapprovedImageSources}, reused=${report.catalogMedia.reusedImageSources}`);
  console.log(`blockerCount: ${report.blockerCount}`);
  console.log('topBlockers:');
  for (const blocker of report.topBlockers) console.log(`- ${blocker}`);
  console.log('nextCommands:');
  for (const command of report.nextCommands) console.log(`- ${command}`);
}

const format = argValue('format', 'text');
const blockerLimit = parseLimit(12);

if (!FORMAT_VALUES.has(format)) {
  console.error(`Unsupported format: ${format}. Use text or json.`);
  process.exit(1);
}

const report = buildReport({ blockerLimit });

if (format === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  printText(report);
}
