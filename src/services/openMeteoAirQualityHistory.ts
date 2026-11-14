import { isLocalDateTime } from './openMeteoAirQuality'

export type AirQualityHistoryMetric = 'usAqi' | 'pm25' | 'pm10'

export type AirQualityHistoryPoint = {
  time: string
  usAqi: number | null
  pm25: number | null
  pm10: number | null
}

type OpenMeteoAirQualityHistoryResponse = {
  hourly?: {
    time?: unknown
    us_aqi?: unknown
    pm2_5?: unknown
    pm10?: unknown
  }
  error?: unknown
  reason?: unknown
}

const API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const LOCAL_TIME_ZONE = 'Asia/Kolkata'

export async function fetchAirQualityHistory(
  latitude: number,
  longitude: number,
  signal: AbortSignal,
): Promise<AirQualityHistoryPoint[]> {
  const url = new URL(API_URL)
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: 'us_aqi,pm2_5,pm10',
    past_days: '92',
    forecast_days: '0',
    timezone: LOCAL_TIME_ZONE,
  }).toString()

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch {
    if (signal.aborted) throw new Error('Air-quality history request was cancelled.')
    throw new Error(
      'Could not connect to the air-quality history service. Check your connection and try again.',
    )
  }

  if (!response.ok) {
    throw new Error(
      `The air-quality history service is temporarily unavailable (HTTP ${response.status}). Try again.`,
    )
  }

  let payload: OpenMeteoAirQualityHistoryResponse
  try {
    payload = (await response.json()) as OpenMeteoAirQualityHistoryResponse
  } catch {
    throw new Error('The air-quality history service returned an unreadable response. Try again.')
  }

  if (payload.error === true) {
    const reason =
      typeof payload.reason === 'string'
        ? payload.reason
        : 'The provider could not return air-quality history for this city.'
    throw new Error(reason)
  }

  const hourly = payload.hourly
  if (!hourly || !isLocalDateTimeArray(hourly.time)) {
    throw new Error('The air-quality history response did not include valid timestamps.')
  }

  const times = hourly.time
  if (times.some((time, index) => index > 0 && time <= times[index - 1])) {
    throw new Error('The air-quality history service returned unordered timestamps.')
  }

  const usAqi = parseSeries(hourly.us_aqi, times.length, 1000)
  const pm25 = parseSeries(hourly.pm2_5, times.length, 10_000)
  const pm10 = parseSeries(hourly.pm10, times.length, 10_000)

  return times.map((time, index) => ({
    time,
    usAqi: usAqi[index],
    pm25: pm25[index],
    pm10: pm10[index],
  }))
}

function isLocalDateTimeArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (time): time is string =>
        typeof time === 'string' && isLocalDateTime(time),
    )
  )
}

function parseSeries(
  value: unknown,
  expectedLength: number,
  maximum: number,
): Array<number | null> {
  if (value === undefined) return Array(expectedLength).fill(null)
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new Error('The air-quality history service returned mismatched data arrays.')
  }

  return value.map((reading) => {
    if (reading === null) return null
    if (
      typeof reading !== 'number' ||
      !Number.isFinite(reading) ||
      reading < 0 ||
      reading > maximum
    ) {
      throw new Error('The air-quality history service returned invalid readings.')
    }
    return reading
  })
}
