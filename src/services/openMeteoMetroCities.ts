export type MetroCityAirQuality = {
  usAqi: number
}

type OpenMeteoMetroResponse = {
  current?: {
    us_aqi?: unknown
  }
  error?: unknown
  reason?: unknown
}

const API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const LOCAL_TIME_ZONE = 'Asia/Kolkata'

export async function fetchMetroCityAirQuality(
  latitude: number,
  longitude: number,
  signal: AbortSignal,
): Promise<MetroCityAirQuality> {
  const url = new URL(API_URL)
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'us_aqi',
    timezone: LOCAL_TIME_ZONE,
  }).toString()

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch {
    if (signal.aborted) throw new Error('Air-quality request was cancelled.')
    throw new Error(
      'Could not connect to the air-quality service. Check your connection and try again.',
    )
  }

  if (!response.ok) {
    throw new Error('Could not load metro air quality.')
  }

  const data = (await response.json()) as OpenMeteoMetroResponse
  if (typeof data.current?.us_aqi !== 'number' || Number.isNaN(data.current.us_aqi)) {
    throw new Error('Invalid metro AQI response.')
  }

  return {
    usAqi: data.current.us_aqi,
  }
}
