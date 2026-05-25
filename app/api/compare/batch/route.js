/**
 * POST /api/compare/batch — Compare prices for multiple hotels in one request.
 *
 * Reduces HTTP roundtrips for the compare-hotels page (1 request instead of N).
 * Server-side parallelism: all hotels fetched concurrently.
 *
 * Body: { hotelKeys: string[], checkIn: string, checkOut: string, currency?: string }
 * Response: { results: { [hotelKey]: ComparisonResult }, totalHotels, successCount, failedKeys }
 */

import { getCachedRatesBatch } from '@/lib/price-cache';
import { findHotel } from '@/lib/hotels-catalog';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { bumpHotelPopularity } from '@/lib/hotel-popularity';
import { buildComparisonResponse } from '../helpers';

const MAX_BATCH_SIZE = 5;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

// Rate limiter: 10 batch requests per minute per IP
const batchLimiter = rateLimit({ namespace: 'compare-batch', limit: 10, window: 60, failOpen: false });

/**
 * GET /api/compare/batch?hotelKeys=g1-d1,g2-d2&checkIn=2026-06-01&checkOut=2026-06-03
 *
 * Same as POST but using query params — enables CDN edge caching (s-maxage).
 * POST bodies can't be cached by CDN/browser; GET can.
 */
export async function GET(request) {
  try {
    const ip = getClientIp(request);
    const { success, reset } = await batchLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const { searchParams } = new URL(request.url);
    const hotelKeys = (searchParams.get('hotelKeys') || '').split(',').filter(Boolean);
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const currency = searchParams.get('currency') || 'USD';

    if (hotelKeys.length === 0 || !checkIn || !checkOut) {
      return Response.json(
        { error: 'Missing required params: hotelKeys, checkIn, checkOut' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const keys = [...new Set(hotelKeys)].slice(0, MAX_BATCH_SIZE);
    const nights = Math.max(1, Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    ));

    const results = {};
    const failedKeys = [];
    const validEntries = [];

    for (const hotelKey of keys) {
      const hotel = findHotel(hotelKey);
      if (!hotel) { failedKeys.push(hotelKey); continue; }
      bumpHotelPopularity(hotelKey);
      validEntries.push({ hotelKey, hotel });
    }

    if (validEntries.length > 0) {
      const paramsList = validEntries.map(({ hotelKey, hotel }) => ({
        hotelKey, hotelName: hotel.name, city: hotel.city, checkIn, checkOut, currency,
      }));
      const batchResults = await getCachedRatesBatch(paramsList);
      for (let i = 0; i < validEntries.length; i++) {
        const { hotelKey, hotel } = validEntries[i];
        try {
          results[hotelKey] = buildComparisonResponse({
            result: batchResults[i], hotel, checkIn, checkOut, currency, nights,
          });
        } catch { failedKeys.push(hotelKey); }
      }
    }

    return Response.json({
      results, totalHotels: keys.length,
      successCount: Object.keys(results).length, failedKeys,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('GET /api/compare/batch error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { success, reset } = await batchLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const body = await request.json();
    const { hotelKeys, checkIn, checkOut, currency = 'USD' } = body || {};

    if (!Array.isArray(hotelKeys) || hotelKeys.length === 0 || !checkIn || !checkOut) {
      return Response.json(
        { error: 'Missing required fields: hotelKeys (array), checkIn, checkOut' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // Enforce batch size limit
    const keys = [...new Set(hotelKeys)].slice(0, MAX_BATCH_SIZE);

    const nights = Math.max(1, Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    ));

    // Resolve hotels and split valid from unknown
    const results = {};
    const failedKeys = [];
    const validEntries = [];

    for (const hotelKey of keys) {
      const hotel = findHotel(hotelKey);
      if (!hotel) {
        failedKeys.push(hotelKey);
        continue;
      }
      bumpHotelPopularity(hotelKey);
      validEntries.push({ hotelKey, hotel });
    }

    // Batch KV lookup: 2 mget round-trips instead of N individual gets
    if (validEntries.length > 0) {
      const paramsList = validEntries.map(({ hotelKey, hotel }) => ({
        hotelKey,
        hotelName: hotel.name,
        city: hotel.city,
        checkIn,
        checkOut,
        currency,
      }));

      const batchResults = await getCachedRatesBatch(paramsList);

      for (let i = 0; i < validEntries.length; i++) {
        const { hotelKey, hotel } = validEntries[i];
        try {
          results[hotelKey] = buildComparisonResponse({
            result: batchResults[i], hotel, checkIn, checkOut, currency, nights,
          });
        } catch {
          failedKeys.push(hotelKey);
        }
      }
    }

    return Response.json({
      results,
      totalHotels: keys.length,
      successCount: Object.keys(results).length,
      failedKeys,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('POST /api/compare/batch error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
