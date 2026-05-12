export function parseNonNegativeNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) {
    throw new ValidationError(`Invalid ${fieldName}`);
  }
  return n;
}

export function parsePositiveInteger(value, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }
  return n;
}

export function parseDate(value, fieldName) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`Invalid ${fieldName}`);
  }
  return d;
}

export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
  }
}

export function errorResponse(err) {
  if (err instanceof ValidationError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  // Support AuthError and any error with a status property (401, 403, etc.)
  if (err && typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error('API error:', err);
  // Never leak internal error details to clients
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
