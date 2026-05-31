const LOCAL_WEBHOOK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function isProductionEnv(env = process.env) {
  return env.NODE_ENV === 'production';
}

function isLocalWebhookHost(hostname) {
  const normalized = normalizeWebhookHostname(hostname);
  return LOCAL_WEBHOOK_HOSTS.has(normalized) || normalized.endsWith('.localhost');
}

function normalizeWebhookHostname(hostname) {
  const normalized = String(hostname).trim().toLowerCase();
  return normalized.endsWith('.') ? normalized.slice(0, -1) : normalized;
}

function stripIpv6Brackets(hostname) {
  const normalized = normalizeWebhookHostname(hostname);
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    return normalized.slice(1, -1);
  }
  return normalized;
}

function parseIpv4Octets(hostname) {
  const normalized = normalizeWebhookHostname(hostname);
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return null;

  const octets = normalized.split('.').map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return octets;
}

function isPrivateIpv4(hostname) {
  const octets = parseIpv4Octets(hostname);
  if (!octets) return false;

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function isRestrictedIpv6(hostname) {
  const normalized = stripIpv6Brackets(hostname);
  if (!normalized.includes(':')) return false;

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('::ffff:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

function isRestrictedWebhookHost(hostname) {
  const normalized = normalizeWebhookHostname(hostname);
  return isLocalWebhookHost(normalized) || isPrivateIpv4(normalized) || isRestrictedIpv6(normalized);
}

export function validWebhookUrl(value, { env = process.env } = {}) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    url.hash = '';

    if (url.protocol === 'http:' && !isProductionEnv(env) && isLocalWebhookHost(url.hostname)) {
      return url.toString();
    }
    if (isRestrictedWebhookHost(url.hostname)) return null;
    if (url.protocol === 'https:') return url.toString();
    return null;
  } catch {
    return null;
  }
}
