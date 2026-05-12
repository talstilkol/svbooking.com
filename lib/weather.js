// Open-Meteo — free weather forecast API, no auth required.
// Returns 7-day forecast with temperature, rain probability, weather codes.
// Perfect for showing weather at hotel destinations.
// https://open-meteo.com/en/docs
//
// Rate limit: generous (no hard limit for reasonable usage)

const METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// WMO Weather interpretation codes
const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Slight snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '🌨️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Rain showers', icon: '🌧️' },
  82: { label: 'Heavy showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm + hail', icon: '⛈️' },
  99: { label: 'Thunderstorm + hail', icon: '⛈️' },
};

/**
 * Get 7-day weather forecast for a location.
 *
 * @param {Object} opts
 * @param {number} opts.lat - Latitude
 * @param {number} opts.lon - Longitude
 * @param {string} [opts.units='celsius'] - 'celsius' or 'fahrenheit'
 * @param {number} [opts.days=7] - Forecast days (1-16)
 * @returns {Promise<{daily: Array<{date, tempMin, tempMax, rainChance, weather, icon}>, timezone}>}
 */
export async function getForecast({ lat, lon, units = 'celsius', days = 7, timeoutMs = 8000 }) {
  const tempUnit = units === 'fahrenheit' ? 'fahrenheit' : 'celsius';

  const url = new URL(METEO_URL);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', String(Math.min(days, 16)));
  if (tempUnit === 'fahrenheit') {
    url.searchParams.set('temperature_unit', 'fahrenheit');
  }

  const data = await fetchWithTimeout(url.toString(), timeoutMs);
  const daily = data?.daily;
  if (!daily?.time) throw new Error('No forecast data returned');

  const forecast = daily.time.map((date, i) => {
    const code = daily.weathercode[i];
    const weather = WEATHER_CODES[code] || { label: 'Unknown', icon: '❓' };

    return {
      date,
      tempMin: daily.temperature_2m_min[i],
      tempMax: daily.temperature_2m_max[i],
      rainChance: daily.precipitation_probability_max[i],
      weather: weather.label,
      icon: weather.icon,
      code,
    };
  });

  return {
    daily: forecast,
    timezone: data.timezone,
    units: tempUnit,
    lat,
    lon,
  };
}

/**
 * Get historical weather averages for a month (useful for trip planning).
 * Uses the past 10 years of data.
 *
 * @param {Object} opts
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @param {number} opts.month - Month number (1-12)
 * @returns {Promise<{avgTempMin, avgTempMax, avgRainDays, month}>}
 */
export async function getMonthlyAverages({ lat, lon, month, timeoutMs = 10000 }) {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;

  // Build date range for the target month across past years
  const startDate = `${startYear}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(currentYear - 1, month, 0).getDate();
  const endDate = `${currentYear - 1}-${String(month).padStart(2, '0')}-${lastDay}`;

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum');
  url.searchParams.set('timezone', 'auto');

  const data = await fetchWithTimeout(url.toString(), timeoutMs);
  const daily = data?.daily;
  if (!daily?.time) throw new Error('No historical data returned');

  const temps_max = daily.temperature_2m_max.filter((t) => t !== null);
  const temps_min = daily.temperature_2m_min.filter((t) => t !== null);
  const precip = daily.precipitation_sum.filter((p) => p !== null);

  const avgTempMax = temps_max.length ? Math.round(temps_max.reduce((a, b) => a + b, 0) / temps_max.length * 10) / 10 : null;
  const avgTempMin = temps_min.length ? Math.round(temps_min.reduce((a, b) => a + b, 0) / temps_min.length * 10) / 10 : null;
  const rainDays = precip.filter((p) => p > 1).length;
  const totalDays = precip.length;
  const avgRainDays = totalDays > 0 ? Math.round((rainDays / totalDays) * 30) : null;

  return { avgTempMin, avgTempMax, avgRainDays, month, years: `${startYear}-${currentYear - 1}` };
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Weather request timed out after ${timeoutMs}ms`);
    throw err;
  }
}
