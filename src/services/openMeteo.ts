export type CurrentWeather = {
  temperatureC: number
  relativeHumidity: number
  weatherCode: number
  windSpeedKph: number
  windDirectionDegrees: number
  apparentTemperatureC: number
  temperatureMaxC: number
  temperatureMinC: number
  precipitationProbability: number
  observedAt: string
}

type OpenMeteoResponse = {
  current?: {
    time?: unknown
    temperature_2m?: unknown
    relative_humidity_2m?: unknown
    weather_code?: unknown
    wind_speed_10m?: unknown
    wind_direction_10m?: unknown
    apparent_temperature?: unknown
  }
  hourly?: {
    time?: unknown
    precipitation_probability?: unknown
  }
  daily?: {
    time?: unknown
    temperature_2m_max?: unknown
    temperature_2m_min?: unknown
  }
  error?: unknown
  reason?: unknown
}

const API_URL = 'https://api.open-meteo.com/v1/forecast'
const LOCAL_TIME_ZONE = 'Asia/Kolkata'

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
  signal: AbortSignal,
): Promise<CurrentWeather> {
  const url = new URL(API_URL)
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature',
    hourly: 'precipitation_probability',
    daily: 'temperature_2m_max,temperature_2m_min',
    forecast_days: '1',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: LOCAL_TIME_ZONE,
  }).toString()

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch {
    if (signal.aborted) throw new Error('Weather request was cancelled.')
    throw new Error('Could not connect to the weather service. Check your connection and try again.')
  }

  if (!response.ok) {
    throw new Error(
      `The weather service is temporarily unavailable (HTTP ${response.status}). Try again.`,
    )
  }

  let payload: OpenMeteoResponse
  try {
    payload = (await response.json()) as OpenMeteoResponse
  } catch {
    throw new Error('The weather service returned an unreadable response. Try again.')
  }

  if (payload.error === true) {
    const reason =
      typeof payload.reason === 'string'
        ? payload.reason
        : 'The provider could not return weather for this city.'
    throw new Error(reason)
  }

  const current = payload.current
  if (!current) {
    throw new Error('The weather service response did not include current conditions.')
  }

  const temperatureC = current.temperature_2m
  const relativeHumidity = current.relative_humidity_2m
  const weatherCode = current.weather_code
  const windSpeedKph = current.wind_speed_10m
  const windDirectionDegrees = current.wind_direction_10m
  const apparentTemperatureC = current.apparent_temperature
  const observedAt = current.time

  if (
    typeof temperatureC !== 'number' ||
    !Number.isFinite(temperatureC) ||
    temperatureC < -90 ||
    temperatureC > 60 ||
    typeof relativeHumidity !== 'number' ||
    !Number.isInteger(relativeHumidity) ||
    relativeHumidity < 0 ||
    relativeHumidity > 100 ||
    typeof weatherCode !== 'number' ||
    !Number.isInteger(weatherCode) ||
    weatherCode < 0 ||
    weatherCode > 99 ||
    typeof windSpeedKph !== 'number' ||
    !Number.isFinite(windSpeedKph) ||
    windSpeedKph < 0 ||
    windSpeedKph > 400 ||
    typeof windDirectionDegrees !== 'number' ||
    !Number.isInteger(windDirectionDegrees) ||
    windDirectionDegrees < 0 ||
    windDirectionDegrees > 360 ||
    typeof apparentTemperatureC !== 'number' ||
    !Number.isFinite(apparentTemperatureC) ||
    apparentTemperatureC < -90 ||
    apparentTemperatureC > 60 ||
    typeof observedAt !== 'string' ||
    !isLocalDateTime(observedAt)
  ) {
    throw new Error('The weather service returned incomplete or invalid current conditions.')
  }

  const hourlyTimes = payload.hourly?.time
  const precipitationProbabilities = payload.hourly?.precipitation_probability
  const hourlyIndex = isStringArray(hourlyTimes)
    ? hourlyTimes.findIndex(
        (time) => time.slice(0, 13) === observedAt.slice(0, 13),
      )
    : -1
  const precipitationProbability =
    isNumberArray(precipitationProbabilities) && hourlyIndex >= 0
      ? precipitationProbabilities[hourlyIndex]
      : undefined
  const dailyTimes = payload.daily?.time
  const dailyMaximums = payload.daily?.temperature_2m_max
  const dailyMinimums = payload.daily?.temperature_2m_min
  const dateIndex =
    isStringArray(dailyTimes)
      ? dailyTimes.indexOf(observedAt.slice(0, 10))
      : -1
  const temperatureMaxC =
    isNumberArray(dailyMaximums) && dateIndex >= 0
      ? dailyMaximums[dateIndex]
      : undefined
  const temperatureMinC =
    isNumberArray(dailyMinimums) && dateIndex >= 0
      ? dailyMinimums[dateIndex]
      : undefined

  if (
    typeof precipitationProbability !== 'number' ||
    !Number.isInteger(precipitationProbability) ||
    precipitationProbability < 0 ||
    precipitationProbability > 100 ||
    typeof temperatureMaxC !== 'number' ||
    !Number.isFinite(temperatureMaxC) ||
    temperatureMaxC < -90 ||
    temperatureMaxC > 60 ||
    typeof temperatureMinC !== 'number' ||
    !Number.isFinite(temperatureMinC) ||
    temperatureMinC < -90 ||
    temperatureMinC > 60 ||
    temperatureMaxC < temperatureMinC
  ) {
    throw new Error('The weather service returned incomplete or invalid forecast details.')
  }

  return {
    temperatureC,
    relativeHumidity,
    weatherCode,
    windSpeedKph,
    windDirectionDegrees,
    apparentTemperatureC,
    temperatureMaxC,
    temperatureMinC,
    precipitationProbability,
    observedAt,
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
}

function isLocalDateTime(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return false

  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const parts = [yearText, monthText, dayText, hourText, minuteText].map(Number)
  const [year, month, day, hour, minute] = parts
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute
  )
}

export function getWeatherCondition(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if ([51, 53, 55].includes(code)) return 'Drizzle'
  if ([56, 57].includes(code)) return 'Freezing drizzle'
  if ([61, 63, 65].includes(code)) return 'Rain'
  if ([66, 67].includes(code)) return 'Freezing rain'
  if ([71, 73, 75, 77].includes(code)) return 'Snowfall'
  if ([80, 81, 82].includes(code)) return 'Rain showers'
  if ([85, 86].includes(code)) return 'Snow showers'
  if (code === 95) return 'Thunderstorm'
  if ([96, 99].includes(code)) return 'Thunderstorm with hail'
  return 'Conditions unavailable'
}

export function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code === 1 || code === 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code === 45 || code === 48) return '🌫️'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return '🌧️'
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '🌥️'
}

export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return directions[Math.round(degrees / 45) % directions.length]
}

export function formatObservationTime(value: string): string {
  const date = new Date(`${value}+05:30`)
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: LOCAL_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function toObservationDateTime(value: string): string {
  return `${value}+05:30`
}
