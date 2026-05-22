// Hotel pricing aggregator — multi-provider system with automatic fallback.
//
// Provider priority is managed in lib/providers/index.js. Optional adapters are
// enabled only when their required environment variables are configured.
// If one provider exhausts quota or errors, the registry can try the next one.
//
// To add providers: create adapter in lib/providers/, register in lib/providers/index.js

export { getHotelRates, getProviderStatus, resetProvider } from './providers/index';
