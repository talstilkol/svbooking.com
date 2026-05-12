// Hotel pricing aggregator — multi-provider system with automatic fallback.
//
// Provider priority:
//   1. Xotelo        — free, no auth, native hotel_key (always available)
//   2. SerpApi       — SERPAPI_KEY env var (250/month free, Google Hotels data)
//   3. Booking.com   — RAPIDAPI_KEY env var (500/month free via RapidAPI)
//   4. TripAdvisor   — RAPIDAPI_KEY env var (500/month free, native TA ID match)
//   5. Makcorps      — MAKCORPS_API_KEY env var (100/month free, Hotels.com data)
//
// Combined free capacity: ~1,350+ requests/month
// If one provider exhausts quota or errors, the next is tried automatically.
//
// To add providers: create adapter in lib/providers/, register in lib/providers/index.js

export { getHotelRates, getProviderStatus, resetProvider } from './providers/index';
