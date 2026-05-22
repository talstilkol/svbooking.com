import { HOTELS, listCities, listCountries } from '../lib/hotels-catalog.js';

const MIN_HOTELS = 133;
const MIN_CITIES = 46;
const MIN_COUNTRIES = 32;
const HOTEL_KEY_PATTERN = /^g\d+-d\d+$/;
const ALLOWED_IMAGE_HOSTS = new Set(['images.unsplash.com']);
const BLOCKED_FIELD_VALUES = new Set([
  'demo',
  'example',
  'fake',
  'placeholder',
  'sample',
  'test',
  'tbd',
  'unknown',
  'unverified',
]);

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

function validateRequiredString(hotel, field) {
  const value = hotel[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${hotel.hotelKey || 'missing-key'} has missing ${field}`);
    return;
  }

  const normalizedValue = normalized(value);
  if (BLOCKED_FIELD_VALUES.has(normalizedValue)) {
    fail(`${hotel.hotelKey} has non-production ${field}: ${value}`);
  }
}

function validateImageUrl(hotel) {
  let url;
  try {
    url = new URL(hotel.image);
  } catch {
    fail(`${hotel.hotelKey} has invalid image URL`);
    return;
  }

  if (url.protocol !== 'https:') {
    fail(`${hotel.hotelKey} image is not HTTPS`);
  }

  if (!ALLOWED_IMAGE_HOSTS.has(url.hostname)) {
    fail(`${hotel.hotelKey} image host is not allowlisted: ${url.hostname}`);
  }

  if (!url.searchParams.has('w') || !url.searchParams.has('q')) {
    warn(`${hotel.hotelKey} image lacks explicit width/quality params`);
  }
}

if (HOTELS.length < MIN_HOTELS) {
  fail(`catalog has ${HOTELS.length} hotels; expected at least ${MIN_HOTELS}`);
}

const cities = listCities();
if (cities.length < MIN_CITIES) {
  fail(`catalog has ${cities.length} cities; expected at least ${MIN_CITIES}`);
}

const countries = listCountries();
if (countries.length < MIN_COUNTRIES) {
  fail(`catalog has ${countries.length} countries; expected at least ${MIN_COUNTRIES}`);
}

const keys = new Set();
const hotelIdentities = new Set();
const imageCities = new Map();

for (const hotel of HOTELS) {
  validateRequiredString(hotel, 'hotelKey');
  validateRequiredString(hotel, 'name');
  validateRequiredString(hotel, 'city');
  validateRequiredString(hotel, 'country');
  validateRequiredString(hotel, 'image');

  if (!HOTEL_KEY_PATTERN.test(hotel.hotelKey)) {
    fail(`${hotel.hotelKey || 'missing-key'} has invalid TripAdvisor/Xotelo key format`);
  }

  if (keys.has(hotel.hotelKey)) {
    fail(`duplicate hotelKey: ${hotel.hotelKey}`);
  }
  keys.add(hotel.hotelKey);

  const identity = [hotel.name, hotel.city, hotel.country].map(normalized).join('|');
  if (hotelIdentities.has(identity)) {
    fail(`duplicate hotel identity: ${hotel.name} / ${hotel.city} / ${hotel.country}`);
  }
  hotelIdentities.add(identity);

  validateImageUrl(hotel);
  if (!imageCities.has(hotel.image)) imageCities.set(hotel.image, new Set());
  imageCities.get(hotel.image).add(hotel.city);
}

for (const [image, citiesUsingImage] of imageCities) {
  if (citiesUsingImage.size > 2) {
    warn(`image reused across ${citiesUsingImage.size} cities: ${image}`);
  }
}

if (warnings.length > 0) {
  console.warn('Catalog audit warnings:');
  for (const message of warnings) console.warn(`- ${message}`);
}

if (failures.length > 0) {
  console.error('Catalog audit failures:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`Catalog audit passed: ${HOTELS.length} hotels, ${cities.length} cities, ${countries.length} countries`);
