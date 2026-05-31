import { isEnvConfigured, normalizedEnvValue } from './env-config.mjs';
import { validWebhookUrl } from './webhook-url.js';

export function isSupportedReviewProvider(value) {
  const providerName = String(value || '').trim().toLowerCase();
  return providerName === 'google-places' || providerName === 'google';
}

export function hasValidWebhookConfig(env, urlName, secretName) {
  return Boolean(
    isEnvConfigured(env, urlName) &&
    isEnvConfigured(env, secretName) &&
    validWebhookUrl(env?.[urlName], { env })
  );
}

export function summarizeLaunchServices(env = process.env) {
  const reviewProviderName = normalizedEnvValue(env, 'REVIEWS_PROVIDER_NAME');
  const licensedReviews = normalizedEnvValue(env, 'REVIEWS_PROVIDER_LICENSED').toLowerCase() === 'true';
  const supportedReviewProvider = isSupportedReviewProvider(reviewProviderName);
  const reviewProviderConfigured = Boolean(
    licensedReviews &&
    supportedReviewProvider &&
    isEnvConfigured(env, 'GOOGLE_PLACES_API_KEY')
  );
  const priceAlertDeliveryConfigured = hasValidWebhookConfig(env, 'PRICE_ALERT_WEBHOOK_URL', 'PRICE_ALERT_WEBHOOK_SECRET');
  const priceAlertUnsubscribeConfigured = isEnvConfigured(env, 'PRICE_ALERT_UNSUBSCRIBE_SECRET');
  const opsAlertDeliveryConfigured = hasValidWebhookConfig(env, 'OPS_ALERT_WEBHOOK_URL', 'OPS_ALERT_WEBHOOK_SECRET');
  const pushConfigured = isEnvConfigured(env, 'NEXT_PUBLIC_PUSH_PUBLIC_KEY') && isEnvConfigured(env, 'PUSH_PRIVATE_KEY');

  return {
    reviews: {
      configured: reviewProviderConfigured,
      provider: reviewProviderName || null,
      licensed: licensedReviews,
      supportedProvider: supportedReviewProvider,
      requiredEnv: ['REVIEWS_PROVIDER_NAME', 'REVIEWS_PROVIDER_LICENSED', 'GOOGLE_PLACES_API_KEY'],
    },
    priceAlerts: {
      deliveryConfigured: priceAlertDeliveryConfigured,
      unsubscribeConfigured: priceAlertUnsubscribeConfigured,
      requiredEnv: ['PRICE_ALERT_WEBHOOK_URL', 'PRICE_ALERT_WEBHOOK_SECRET', 'PRICE_ALERT_UNSUBSCRIBE_SECRET'],
    },
    opsAlerts: {
      deliveryConfigured: opsAlertDeliveryConfigured,
      requiredEnv: ['OPS_ALERT_WEBHOOK_URL', 'OPS_ALERT_WEBHOOK_SECRET'],
    },
    push: {
      configured: pushConfigured,
      requiredEnv: ['NEXT_PUBLIC_PUSH_PUBLIC_KEY', 'PUSH_PRIVATE_KEY'],
    },
  };
}

export function areLaunchServicesReady(launchServices) {
  return Boolean(
    launchServices?.reviews?.configured &&
    launchServices?.priceAlerts?.deliveryConfigured &&
    launchServices?.priceAlerts?.unsubscribeConfigured &&
    launchServices?.opsAlerts?.deliveryConfigured &&
    launchServices?.push?.configured
  );
}

export function buildLaunchServiceBlockers(launchServices) {
  return [
    !launchServices?.reviews?.configured && 'Licensed review/property provider is not configured',
    !launchServices?.priceAlerts?.deliveryConfigured && 'Price alert webhook delivery is not configured',
    !launchServices?.priceAlerts?.unsubscribeConfigured && 'Price alert unsubscribe secret is not configured',
    !launchServices?.opsAlerts?.deliveryConfigured && 'Ops alert webhook delivery is not configured',
    !launchServices?.push?.configured && 'Web push keys are not configured',
  ].filter(Boolean);
}
