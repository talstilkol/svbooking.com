function cleanUrlText(value) {
  if (value instanceof URL) return value.toString();
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ');
  return text || null;
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [a, b] = octets;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
  );
}

function stripIpv6Brackets(hostname) {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function isRestrictedIpv6(hostname) {
  const host = stripIpv6Brackets(hostname);
  if (!host.includes(':')) return false;
  return (
    host === '::'
    || host === '::1'
    || host.startsWith('::ffff:')
    || host.startsWith('fc')
    || host.startsWith('fd')
    || host.startsWith('fe8')
    || host.startsWith('fe9')
    || host.startsWith('fea')
    || host.startsWith('feb')
  );
}

function isPrivateHostname(hostname) {
  const host = String(hostname).trim().toLowerCase().replace(/\.$/u, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  return isPrivateIpv4(host) || isRestrictedIpv6(host);
}

export function normalizeHttpsUrl(value) {
  const text = cleanUrlText(value);
  if (!text) return null;

  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (isPrivateHostname(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
