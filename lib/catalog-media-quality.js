import { HOTELS, buildStaticCatalogProvenanceLedger } from './hotels-catalog.js';

const MAX_REUSE_CITIES_PER_IMAGE = 2;
const MEDIA_ACTION_REASON_ORDER = [
  'missing-image',
  'invalid-image-url',
  'non-https-image-url',
  'missing-sizing-params',
  'missing-source-or-license-metadata',
  'license-approval-required',
  'reused-across-cities',
];

function clampScore(value) {
  const numeric = Number(value);
  return Math.max(0, Math.min(1, numeric));
}

function normalizedCity(value) {
  return String(value || 'unknown/unavailable').trim() || 'unknown/unavailable';
}

function hotelIdentifier(hotel) {
  return String(hotel?.hotelKey || hotel?.name || 'unknown/unavailable');
}

function hotelReviewTarget(hotel, index) {
  return {
    hotelKey: typeof hotel?.hotelKey === 'string' && hotel.hotelKey.trim() ? hotel.hotelKey.trim() : `catalog-index-${index}`,
    name: typeof hotel?.name === 'string' && hotel.name.trim() ? hotel.name.trim() : null,
    city: normalizedCity(hotel?.city),
    country: typeof hotel?.country === 'string' && hotel.country.trim() ? hotel.country.trim() : null,
  };
}

function sortReasons(reasons) {
  return MEDIA_ACTION_REASON_ORDER.filter((reason) => reasons.has(reason));
}

function imageReuseSummary(imageCities, maxReuseCities) {
  return Array.from(imageCities.entries())
    .map(([image, cities]) => ({
      image,
      cityCount: cities.size,
      cities: Array.from(cities).sort((a, b) => a.localeCompare(b)),
    }))
    .filter((item) => item.cityCount > maxReuseCities)
    .sort((a, b) => b.cityCount - a.cityCount || a.image.localeCompare(b.image));
}

export function buildCatalogMediaActionLedger({
  hotels = HOTELS,
  maxReuseCities = MAX_REUSE_CITIES_PER_IMAGE,
  provenanceLedger,
} = {}) {
  const catalogHotels = Array.isArray(hotels) ? hotels : [];
  const catalogProvenanceLedger = Array.isArray(provenanceLedger)
    ? provenanceLedger
    : buildStaticCatalogProvenanceLedger({ hotels: catalogHotels });
  const imageCities = new Map();
  const itemsByKey = new Map();

  function queueItem({ key, image, imageProvenance }) {
    if (!itemsByKey.has(key)) {
      itemsByKey.set(key, {
        image,
        sourceUrl: imageProvenance?.sourceUrl || image || null,
        sourceHost: imageProvenance?.sourceHost || null,
        licenseStatus: imageProvenance?.licenseStatus || 'missing',
        approvedLicense: imageProvenance?.approvedLicense === true,
        replacementRequired: imageProvenance?.replacementRequired !== false,
        cities: new Set(),
        hotels: [],
        reasons: new Set(),
      });
    }
    return itemsByKey.get(key);
  }

  for (const [index, hotel] of catalogHotels.entries()) {
    const image = typeof hotel?.image === 'string' ? hotel.image.trim() : '';
    const imageProvenance = catalogProvenanceLedger[index]?.image;
    const item = queueItem({
      key: image || `missing-image:${index}:${hotelIdentifier(hotel)}`,
      image: image || null,
      imageProvenance,
    });
    const target = hotelReviewTarget(hotel, index);

    item.hotels.push(target);
    item.cities.add(target.city);

    if (!image) {
      item.reasons.add('missing-image');
      continue;
    }

    let parsed;
    try {
      parsed = new URL(image);
    } catch {
      item.reasons.add('invalid-image-url');
      continue;
    }

    if (!imageCities.has(image)) imageCities.set(image, new Set());
    imageCities.get(image).add(target.city);

    if (parsed.protocol !== 'https:') {
      item.reasons.add('non-https-image-url');
    }

    if (!parsed.searchParams.has('w') || !parsed.searchParams.has('q')) {
      item.reasons.add('missing-sizing-params');
    }

    if (
      imageProvenance?.status !== 'source-metadata-available'
      || !imageProvenance?.source
      || !imageProvenance?.sourceHost
      || !imageProvenance?.sourceUrl
      || !imageProvenance?.licenseStatus
    ) {
      item.reasons.add('missing-source-or-license-metadata');
    } else if (imageProvenance.approvedLicense !== true) {
      item.reasons.add('license-approval-required');
    }
  }

  for (const reused of imageReuseSummary(imageCities, maxReuseCities)) {
    itemsByKey.get(reused.image).reasons.add('reused-across-cities');
  }

  const items = Array.from(itemsByKey.values())
    .map((item) => ({
      image: item.image,
      sourceUrl: item.sourceUrl,
      sourceHost: item.sourceHost,
      licenseStatus: item.licenseStatus,
      approvedLicense: item.approvedLicense,
      replacementRequired: item.replacementRequired,
      cityCount: item.cities.size,
      cities: Array.from(item.cities).sort((a, b) => a.localeCompare(b)),
      hotelCount: item.hotels.length,
      hotels: item.hotels.sort((a, b) => (
        a.city.localeCompare(b.city)
        || String(a.name || '').localeCompare(String(b.name || ''))
        || a.hotelKey.localeCompare(b.hotelKey)
      )),
      reasons: sortReasons(item.reasons),
    }))
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => (
      b.reasons.length - a.reasons.length
      || b.cityCount - a.cityCount
      || b.hotelCount - a.hotelCount
      || String(a.sourceUrl || a.image || '').localeCompare(String(b.sourceUrl || b.image || ''))
    ));

  return {
    summary: {
      totalItems: items.length,
      totalHotels: items.reduce((total, item) => total + item.hotelCount, 0),
      reusedImageSources: items.filter((item) => item.reasons.includes('reused-across-cities')).length,
      unapprovedImageSources: items.filter((item) => item.reasons.includes('license-approval-required')).length,
      missingOrInvalidImageItems: items.filter((item) => (
        item.reasons.includes('missing-image') || item.reasons.includes('invalid-image-url')
      )).length,
      maxReuseCities,
    },
    items,
  };
}

export function buildCatalogMediaQuality({
  hotels = HOTELS,
  maxReuseCities = MAX_REUSE_CITIES_PER_IMAGE,
  provenanceLedger,
} = {}) {
  const catalogHotels = Array.isArray(hotels) ? hotels : [];
  const catalogProvenanceLedger = Array.isArray(provenanceLedger)
    ? provenanceLedger
    : buildStaticCatalogProvenanceLedger({ hotels: catalogHotels });
  const imageCities = new Map();
  const missingImages = [];
  const invalidImages = [];
  const nonHttpsImages = [];
  const imagesWithoutSizing = [];
  const missingImageSourceMetadata = [];
  const unapprovedImageSources = new Set();

  for (const [index, hotel] of catalogHotels.entries()) {
    const identifier = hotelIdentifier(hotel);
    const image = typeof hotel?.image === 'string' ? hotel.image.trim() : '';
    const imageProvenance = catalogProvenanceLedger[index]?.image;

    if (!image) {
      missingImages.push(identifier);
      continue;
    }

    let parsed;
    try {
      parsed = new URL(image);
    } catch {
      invalidImages.push(identifier);
      continue;
    }

    if (parsed.protocol !== 'https:') {
      nonHttpsImages.push(identifier);
    }

    if (!parsed.searchParams.has('w') || !parsed.searchParams.has('q')) {
      imagesWithoutSizing.push(identifier);
    }

    if (
      imageProvenance?.status !== 'source-metadata-available'
      || !imageProvenance?.source
      || !imageProvenance?.sourceHost
      || !imageProvenance?.sourceUrl
      || !imageProvenance?.licenseStatus
    ) {
      missingImageSourceMetadata.push(identifier);
    } else if (imageProvenance.approvedLicense !== true) {
      unapprovedImageSources.add(imageProvenance.sourceUrl);
    }

    if (!imageCities.has(image)) imageCities.set(image, new Set());
    imageCities.get(image).add(normalizedCity(hotel?.city));
  }

  const reusedImages = imageReuseSummary(imageCities, maxReuseCities);
  const actionLedger = buildCatalogMediaActionLedger({
    hotels: catalogHotels,
    maxReuseCities,
    provenanceLedger: catalogProvenanceLedger,
  });
  const hardFailures = missingImages.length + invalidImages.length + nonHttpsImages.length;
  const reviewFindings = hardFailures
    + reusedImages.length
    + imagesWithoutSizing.length
    + missingImageSourceMetadata.length
    + unapprovedImageSources.size;
  const score = catalogHotels.length === 0 ? 0 : clampScore(1 - (reviewFindings / catalogHotels.length));
  const blockers = [
    catalogHotels.length === 0 && 'No catalog hotels available for media quality scoring',
    ...missingImages.map((identifier) => `${identifier}: missing catalog image`),
    ...invalidImages.map((identifier) => `${identifier}: invalid catalog image URL`),
    ...nonHttpsImages.map((identifier) => `${identifier}: catalog image URL is not HTTPS`),
    ...reusedImages.map((item) => `Catalog image reused across ${item.cityCount} cities: ${item.image}`),
    missingImageSourceMetadata.length > 0 && `${missingImageSourceMetadata.length} catalog images are missing source or license-status metadata`,
    unapprovedImageSources.size > 0 && `${unapprovedImageSources.size} catalog image sources require approved license metadata or replacement`,
  ].filter(Boolean);

  return {
    status: hardFailures > 0 || catalogHotels.length === 0
      ? 'blocked'
      : reusedImages.length > 0 || imagesWithoutSizing.length > 0 || missingImageSourceMetadata.length > 0 || unapprovedImageSources.size > 0
        ? 'partial'
        : 'healthy',
    score: Number(score.toFixed(2)),
    current: {
      hotels: catalogHotels.length,
      uniqueImages: imageCities.size,
      reusedImages: reusedImages.length,
      imagesWithoutSizing: imagesWithoutSizing.length,
      missingImageSourceMetadata: missingImageSourceMetadata.length,
      unapprovedImageSources: unapprovedImageSources.size,
      maxReuseCities,
    },
    target: {
      missingImages: 0,
      invalidImages: 0,
      nonHttpsImages: 0,
      reusedImages: 0,
      imagesWithoutSizing: 0,
      maxReuseCitiesPerImage: maxReuseCities,
      licensedImageSourceMetadata: true,
    },
    reusedImages,
    actionLedger: actionLedger.summary,
    blockers,
    nextActions: [
      'Replace reused catalog media with licensed hotel- or city-specific images',
      'Attach source and license metadata before treating catalog media quality as healthy',
    ],
  };
}
