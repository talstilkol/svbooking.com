import { ValidationError } from './validation';

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return '';
  }
}

export function expectedRequestOrigin(request) {
  const requestUrl = new URL(request.url);
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'));
  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'));
  const host = forwardedHost || firstHeaderValue(request.headers.get('host')) || requestUrl.host;
  const protocol = forwardedProto
    ? `${forwardedProto.replace(/:$/, '')}:`
    : requestUrl.protocol;

  return normalizeOrigin(`${protocol}//${host}`);
}

export function isSameOriginRequest(request) {
  const secFetchSite = String(request.headers.get('sec-fetch-site') || '').toLowerCase();
  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    return false;
  }

  const origin = request.headers.get('origin');
  if (secFetchSite === 'same-site' && !origin) return false;

  const expected = expectedRequestOrigin(request);
  if (!expected) return false;

  if (!origin) {
    const referer = request.headers.get('referer');
    if (!referer) return true;
    return normalizeOrigin(referer) === expected;
  }

  const actual = normalizeOrigin(origin);
  return Boolean(actual && actual === expected);
}

export function assertSameOrigin(request) {
  if (!isSameOriginRequest(request)) {
    throw new ValidationError('Same-origin request required', 403);
  }
}
