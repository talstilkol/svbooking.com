import { handlePriceRecommendationRequest } from '@/lib/agent-price-recommendation';

const SUCCESSOR_ENDPOINT = '/api/agents/price-recommendation';

// GET /api/agent?hotelKey=...&checkIn=...&checkOut=...
export async function GET(request) {
  const response = await handlePriceRecommendationRequest(request);
  response.headers.set('Deprecation', 'true');
  response.headers.set('Link', `<${SUCCESSOR_ENDPOINT}>; rel="successor-version"`);
  return response;
}
