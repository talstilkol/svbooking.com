import { HOTELS, buildStaticCatalogProvenanceLedger } from './hotels-catalog.js';

const MAX_REUSE_CITIES_PER_IMAGE = 2;

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
    blockers,
    nextActions: [
      'Replace reused catalog media with licensed hotel- or city-specific images',
      'Attach source and license metadata before treating catalog media quality as healthy',
    ],
  };
}
