import { handlePriceRecommendationRequest } from '@/lib/agent-price-recommendation';

// Canonical replacement for legacy GET /api/agent.
export async function GET(request) {
  return handlePriceRecommendationRequest(request);
}
