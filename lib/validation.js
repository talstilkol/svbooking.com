import mongoose from 'mongoose';

export function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
}

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
  console.error('API error:', err);
  const message = err instanceof Error ? err.message : 'Server error';
  return Response.json({ error: message }, { status: 500 });
}
