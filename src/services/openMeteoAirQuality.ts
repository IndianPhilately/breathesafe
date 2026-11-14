export type CurrentAirQuality = {
  usAqi: number
  pm25: number
  pm10: number
  carbonMonoxide: number
  nitrogenDioxide: number
  sulphurDioxide: number
  ozone: number
  modelTime: string
}

type OpenMeteoAirQualityResponse = {
  current?: {
    time?: unknown
    us_aqi?: unknown
    pm2_5?: unknown
    pm10?: unknown
    carbon_monoxide?: unknown
    nitrogen_dioxide?: unknown
    sulphur_dioxide?: unknown
    ozone?: unknown
  }
  error?: unknown
  reason?: unknown
}

const API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const LOCAL_TIME_ZONE = 'Asia/Kolkata'

export async function fetchCurrentAirQuality(
  latitude: number,
  longitude: number,
  signal: AbortSignal,
): Promise<CurrentAirQuality> {
  const url = new URL(API_URL)
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      'us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
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
    throw new Error(
      `The air-quality service is temporarily unavailable (HTTP ${response.status}). Try again.`,
    )
  }

  let payload: OpenMeteoAirQualityResponse
  try {
    payload = (await response.json()) as OpenMeteoAirQualityResponse
  } catch {
    throw new Error('The air-quality service returned an unreadable response. Try again.')
  }

  if (payload.error === true) {
    const reason =
      typeof payload.reason === 'string'
        ? payload.reason
        : 'The provider could not return air quality for this city.'
    throw new Error(reason)
  }

  const current = payload.current
  if (!current) {
    throw new Error('The air-quality service response did not include current conditions.')
  }

  const usAqi = current.us_aqi
  const pm25 = current.pm2_5
  const pm10 = current.pm10
  const carbonMonoxide = current.carbon_monoxide
  const nitrogenDioxide = current.nitrogen_dioxide
  const sulphurDioxide = current.sulphur_dioxide
  const ozone = current.ozone
  const modelTime = current.time

  if (
    typeof usAqi !== 'number' ||
    !Number.isFinite(usAqi) ||
    usAqi < 0 ||
    usAqi > 1000 ||
    !isValidConcentration(pm25) ||
    !isValidConcentration(pm10) ||
    !isValidConcentration(carbonMonoxide, 100_000) ||
    !isValidConcentration(nitrogenDioxide) ||
    !isValidConcentration(sulphurDioxide) ||
    !isValidConcentration(ozone) ||
    typeof modelTime !== 'string' ||
    !isLocalDateTime(modelTime)
  ) {
    throw new Error('The air-quality service returned incomplete or invalid current conditions.')
  }

  return {
    usAqi,
    pm25,
    pm10,
    carbonMonoxide,
    nitrogenDioxide,
    sulphurDioxide,
    ozone,
    modelTime,
  }
}

export function getUsAqiCategory(aqi: number): string {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups'
  if (aqi <= 200) return 'Unhealthy'
  if (aqi <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

function isLocalDateTime(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return false

  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const [year, month, day, hour, minute] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
  ].map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute
  )
}

function isValidConcentration(value: unknown, maximum = 10_000): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= maximum
  )
}
