import { kv } from '@/lib/kv';
import { RETENTION_SECONDS } from '@/lib/data-retention';
import { hashId } from '@/lib/utils/hashId';

export const USER_DATA_DELETE_CONFIRMATION = 'DELETE_MY_SV_BOOKING_DATA';
export const PRICE_ALERT_USER_INDEX_KEY = 'price-alerts:user-index';
export const PRICE_ALERT_EVENTS_KEY = 'price-alerts:events';

export const USER_DATASETS = Object.freeze({
  favorites: Object.freeze({ id: 'favorites', keySuffix: 'favorites', responseKey: 'favorites' }),
  trips: Object.freeze({ id: 'trips', keySuffix: 'trips', responseKey: 'trips' }),
  preferences: Object.freeze({ id: 'preferences', keySuffix: 'prefs', responseKey: 'prefs' }),
  priceAlerts: Object.freeze({ id: 'priceAlerts', keySuffix: 'price-alerts', responseKey: 'priceAlerts' }),
});

export function userDataKey(uid, datasetId) {
  const dataset = USER_DATASETS[datasetId];
  if (!uid || !dataset) throw new Error('Unknown user data key');
  return `user:${uid}:${dataset.keySuffix}`;
}

export function priceAlertUserFingerprint(uid) {
  return hashId('price-alert-user', uid);
}

export function userDataSubjectFingerprint(uid) {
  return hashId('user-data-subject', uid);
}

export function getUserDataPrivacyReadiness() {
  return {
    status: 'available',
    endpoint: '/api/me/data',
    exportAvailable: true,
    deletionAvailable: true,
    deletionRequiresConfirmationHeader: true,
    operationalCleanup: ['price-alert-user-index', 'price-alert-events'],
    rawUserIdInExportEnvelope: false,
    rawUserIdInOperationalEvents: false,
  };
}

function itemCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return 0;
}

export async function getUserDataSnapshot(uid) {
  const entries = await Promise.all(
    Object.values(USER_DATASETS).map(async (dataset) => [
      dataset.responseKey,
      (await kv.get(userDataKey(uid, dataset.id))) || (dataset.responseKey === 'prefs' ? {} : []),
    ])
  );
  const datasets = Object.fromEntries(entries);
  const counts = Object.fromEntries(
    Object.entries(datasets).map(([name, value]) => [name, itemCount(value)])
  );

  return {
    service: 'sv-booking',
    version: 1,
    exportedAt: new Date().toISOString(),
    subjectFingerprint: userDataSubjectFingerprint(uid),
    datasets,
    counts,
    retention: {
      userOwnedDeletion: 'available-via-DELETE-/api/me/data',
      operationalEvents: 'fingerprints-only-and-ttl-backed',
      rawUserIdInOperationalEvents: false,
    },
  };
}

async function removeUidFromPriceAlertIndex(uid) {
  const indexedUsers = (await kv.get(PRICE_ALERT_USER_INDEX_KEY)) || [];
  if (!Array.isArray(indexedUsers)) return 0;
  const next = indexedUsers.filter((entry) => entry !== uid);
  await kv.set(PRICE_ALERT_USER_INDEX_KEY, next);
  return indexedUsers.length - next.length;
}

async function removeUserPriceAlertEvents(uid) {
  const fingerprint = priceAlertUserFingerprint(uid);
  const events = (await kv.get(PRICE_ALERT_EVENTS_KEY)) || [];
  if (!Array.isArray(events)) return 0;
  const next = events.filter((event) => event?.userFingerprint !== fingerprint);
  await kv.setWithTTL(PRICE_ALERT_EVENTS_KEY, next, RETENTION_SECONDS.priceAlertEvents);
  return events.length - next.length;
}

export async function deleteUserData(uid) {
  const before = await getUserDataSnapshot(uid);
  await Promise.all(
    Object.values(USER_DATASETS).map((dataset) => kv.del(userDataKey(uid, dataset.id)))
  );

  const removedPriceAlertIndexEntries = await removeUidFromPriceAlertIndex(uid);
  const removedPriceAlertEvents = await removeUserPriceAlertEvents(uid);

  return {
    service: 'sv-booking',
    deleted: true,
    deletedAt: new Date().toISOString(),
    subjectFingerprint: before.subjectFingerprint,
    deletedDatasets: Object.values(USER_DATASETS).map((dataset) => dataset.responseKey),
    countsBeforeDeletion: before.counts,
    operationalCleanup: {
      removedPriceAlertIndexEntries,
      removedPriceAlertEvents,
      rawUserIdInOperationalEvents: false,
    },
  };
}
