import { handlePriceRecommendationRequest } from '@/lib/agent-price-recommendation';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const SUCCESSOR_ENDPOINT = '/api/agents/price-recommendation';

const agentLimiter = rateLimit({ namespace: 'api-agent-deprecated', limit: 10, window: 60, failOpen: false });

// GET /api/agent?hotelKey=...&checkIn=...&checkOut=...
// DEPRECATED — use /api/agents/price-recommendation instead
export async function GET(request) {
  const ip = getClientIp(request);
  const { success, reset } = await agentLimiter.check(ip);
  if (!success) return rateLimitResponse(reset);

  const response = await handlePriceRecommendationRequest(request);
  response.headers.set('Deprecation', 'true');
  response.headers.set('Link', `<${SUCCESSOR_ENDPOINT}>; rel="successor-version"`);
  return response;
}
