import { kv } from './kv';
import { hashId } from './utils/hashId';
import { RETENTION_SECONDS } from './data-retention';
import { getClientIp } from './rate-limit';

const AUDIT_INDEX_KEY = 'admin:audit:index';
const AUDIT_KEY_PREFIX = 'admin:audit:event:';
const AUDIT_TTL_SECONDS = RETENTION_SECONDS.adminAuditEvents;
const MAX_AUDIT_EVENTS = 200;
const MAX_AUDIT_TEXT_LENGTH = 200;
const MAX_AUDIT_KEY_LENGTH = 80;
const REDACTED = '[redacted]';
const SENSITIVE_KEY_PATTERN = /(authorization|bearer|cookie|password|secret|token|api[_-]?key|apikey|credential|session)/i;
const SENSITIVE_VALUE_PATTERN = /\b(?:bearer|basic)\s+[a-z0-9._~+/-]+=*|\b(?:password|secret|token|api[_-]?key|credential)\s*[:=]\s*[^,\s;]+/i;

function auditKey(id) {
  return `${AUDIT_KEY_PREFIX}${id}`;
}

function getHeader(request, name) {
  return request.headers.get(name) || '';
}

function cleanAuditText(value, maxLength = MAX_AUDIT_TEXT_LENGTH) {
  const cleaned = String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
}

function sanitizeAuditKey(value) {
  return cleanAuditText(value, MAX_AUDIT_KEY_LENGTH) || 'unknown';
}

function sanitizeActor(actor) {
  const cleaned = cleanAuditText(actor, 120) || 'admin';
  const actorType = ['admin-api-secret', 'cron-secret'].includes(cleaned)
    ? cleaned
    : 'admin-identity';
  return {
    actor: actorType,
    actorFingerprint: hashId('admin-actor', cleaned),
  };
}

function getClientFingerprint(request) {
  const source = getClientIp(request);
  const userAgent = cleanAuditText(getHeader(request, 'user-agent'), 120);
  return hashId('admin-client', source, userAgent);
}

export function sanitizeAuditDetails(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[max-depth]';

  if (typeof value === 'string') {
    const cleaned = cleanAuditText(value);
    return SENSITIVE_VALUE_PATTERN.test(cleaned) ? REDACTED : cleaned;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeAuditDetails(entry, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized = {};
    for (const [key, entry] of Object.entries(value).slice(0, 40)) {
      const safeKey = sanitizeAuditKey(key);
      sanitized[safeKey] = SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED
        : sanitizeAuditDetails(entry, depth + 1);
    }
    return sanitized;
  }

  return String(value);
}

export async function recordAdminAuditEvent({ request, actor = 'admin', action, resource, status = 'success', details = {} }) {
  try {
    const at = new Date().toISOString();
    const url = new URL(request.url);
    const clientFingerprint = getClientFingerprint(request);
    const actorSummary = sanitizeActor(actor);
    const existing = (await kv.get(AUDIT_INDEX_KEY)) || [];
    const sequence = existing.length;
    const sanitizedDetails = sanitizeAuditDetails(details);
    const event = {
      id: hashId(
        'admin-audit',
        at,
        sequence,
        action,
        resource || '',
        status,
        clientFingerprint,
        actorSummary.actorFingerprint,
        JSON.stringify(sanitizedDetails)
      ),
      at,
      actor: actorSummary.actor,
      actorFingerprint: actorSummary.actorFingerprint,
      action,
      resource: resource || null,
      status,
      method: request.method,
      path: url.pathname,
      clientFingerprint,
      details: sanitizedDetails,
    };

    await kv.setWithTTL(auditKey(event.id), event, AUDIT_TTL_SECONDS);

    const next = [event.id, ...existing.filter((id) => id !== event.id)].slice(0, MAX_AUDIT_EVENTS);
    await kv.setWithTTL(AUDIT_INDEX_KEY, next, AUDIT_TTL_SECONDS);

    return event;
  } catch (err) {
    console.error('Admin audit write failed:', err);
    return null;
  }
}

export async function getAdminAuditEvents(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, MAX_AUDIT_EVENTS));
  const ids = ((await kv.get(AUDIT_INDEX_KEY)) || []).slice(0, safeLimit);
  if (ids.length === 0) return [];
  const events = await kv.mget(ids.map(auditKey));
  return events.filter(Boolean);
}
