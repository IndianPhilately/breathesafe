const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_API_URL = 'https://archive-api.open-meteo.com/v1/archive'
const LOCAL_TIME_ZONE = 'Asia/Kolkata'
const FORECAST_DAYS = 16
const CLIMATE_YEARS = 10

type DailyWeatherRecord = {
  date: string
  temperatureMaxC: number
  temperatureMinC: number
  weatherCode?: number
}

export type MonthlyWeatherSource =
  | 'historical'
  | 'forecast'
  | 'typical'
  | 'unavailable'

export type MonthlyWeatherDay = {
  date: string
  source: MonthlyWeatherSource
  temperatureMaxC?: number
  temperatureMinC?: number
  weatherCode?: number
  sampleCount?: number
}

export type MonthlyWeatherData = {
  month: string
  days: MonthlyWeatherDay[]
  sourceCounts: Record<MonthlyWeatherSource, number>
  warnings: string[]
}

type DailyResponse = {
  daily?: {
    time?: unknown
    temperature_2m_max?: unknown
    temperature_2m_min?: unknown
    weather_code?: unknown
  }
  error?: unknown
  reason?: unknown
}

function getIndiaDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LOCAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getInitialForecastMonth(): string {
  return getIndiaDate().slice(0, 7)
}

export function formatForecastMonth(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`)
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function shiftForecastMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function fetchMonthlyWeather(
  latitude: number,
  longitude: number,
  month: string,
  signal: AbortSignal,
): Promise<MonthlyWeatherData> {
  const today = getIndiaDate()
  const currentMonth = today.slice(0, 7)
  const monthStart = `${month}-01`
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`
  const forecastEnd = addDays(today, FORECAST_DAYS - 1)
  const needsForecast = monthStart <= forecastEnd && monthEnd >= today
  const isPastMonth = month < currentMonth
  const archiveStart = isPastMonth
    ? monthStart
    : `${year - CLIMATE_YEARS}-${String(monthNumber).padStart(2, '0')}-01`
  const lastCompletedYear = year - 1
  const lastCompletedMonthEnd = `${lastCompletedYear}-${String(monthNumber).padStart(2, '0')}-${String(
    new Date(Date.UTC(lastCompletedYear, monthNumber, 0)).getUTCDate(),
  ).padStart(2, '0')}`
  const historicalEnd = today > monthStart ? addDays(today, -1) : ''
  const archiveEnd = isPastMonth
    ? monthEnd
    : historicalEnd > lastCompletedMonthEnd
      ? historicalEnd
      : lastCompletedMonthEnd

  const archivePromise = fetchDailyRecords(
    ARCHIVE_API_URL,
    latitude,
    longitude,
    archiveStart,
    archiveEnd,
    signal,
  )
  const forecastPromise = needsForecast
    ? fetchDailyRecords(
        FORECAST_API_URL,
        latitude,
        longitude,
        today,
        forecastEnd,
        signal,
        true,
      )
    : null

  const [archiveResult, forecastResult] = await Promise.allSettled([
    archivePromise,
    forecastPromise ?? Promise.resolve([] as DailyWeatherRecord[]),
  ])
  if (signal.aborted) {
    throw new Error('Weather calendar request was cancelled.')
  }

  const archiveRecords =
    archiveResult.status === 'fulfilled' ? archiveResult.value : []
  const forecastRecords =
    forecastResult.status === 'fulfilled'
      ? forecastResult.value
      : []
  const lastAvailableForecastDate =
    needsForecast && forecastResult.status === 'fulfilled'
      ? forecastRecords.reduce(
          (latest, record) => (record.date > latest ? record.date : latest),
          addDays(today, -1),
        )
      : forecastEnd
  const warnings: string[] = []

  if (archiveResult.status === 'rejected') {
    warnings.push(
      `Historical and typical weather data could not be loaded: ${getErrorMessage(archiveResult.reason)}`,
    )
  }
  if (needsForecast && forecastResult.status === 'rejected') {
    warnings.push(
      `The 16-day forecast could not be loaded: ${getErrorMessage(forecastResult.reason)}`,
    )
  }
  if (
    archiveResult.status === 'rejected' &&
    (!needsForecast || forecastResult.status === 'rejected')
  ) {
    throw new Error(warnings.join(' '))
  }

  const archiveByDate = new Map(
    archiveRecords.map((record) => [record.date, record]),
  )
  const forecastByDate = new Map(
    forecastRecords.map((record) => [record.date, record]),
  )
  const days: MonthlyWeatherDay[] = []

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = `${month}-${String(dayNumber).padStart(2, '0')}`
    if (date < today) {
      const historical = archiveByDate.get(date)
      days.push(
        historical
          ? { ...historical, source: 'historical' }
          : { date, source: 'unavailable' },
      )
      continue
    }

    if (date <= lastAvailableForecastDate) {
      const forecast = forecastByDate.get(date)
      days.push(
        forecast
          ? { ...forecast, source: 'forecast' }
          : { date, source: 'unavailable' },
      )
      continue
    }

    const typical = getTypicalRecord(archiveRecords, date, year)
    days.push(
      typical
        ? {
            ...typical,
            date,
            source: 'typical',
            sampleCount: typical.sampleCount,
          }
        : { date, source: 'unavailable' },
    )
  }

  const sourceCounts: Record<MonthlyWeatherSource, number> = {
    historical: 0,
    forecast: 0,
    typical: 0,
    unavailable: 0,
  }
  for (const day of days) {
    sourceCounts[day.source] += 1
  }

  if (sourceCounts.unavailable > 0) {
    warnings.push(
      'Some dates have no available archive, forecast, or typical-weather data yet.',
    )
  }

  return { month, days, sourceCounts, warnings }
}

function getTypicalRecord(
  records: DailyWeatherRecord[],
  date: string,
  targetYear: number,
): (DailyWeatherRecord & { sampleCount: number }) | null {
  const monthDay = date.slice(5)
  const matchingRecords = records.filter(
    (record) =>
      record.date.slice(5) === monthDay &&
      Number(record.date.slice(0, 4)) >= targetYear - CLIMATE_YEARS &&
      Number(record.date.slice(0, 4)) < targetYear,
  )
  if (matchingRecords.length === 0) return null

  const temperatureMaxC =
    matchingRecords.reduce((sum, record) => sum + record.temperatureMaxC, 0) /
    matchingRecords.length
  const temperatureMinC =
    matchingRecords.reduce((sum, record) => sum + record.temperatureMinC, 0) /
    matchingRecords.length
  const codes = matchingRecords.flatMap((record) =>
    record.weatherCode === undefined ? [] : [record.weatherCode],
  )
  const weatherCode = getMostCommonValue(codes)

  return {
    date,
    temperatureMaxC,
    temperatureMinC,
    weatherCode,
    sampleCount: matchingRecords.length,
  }
}

function getMostCommonValue(values: number[]): number | undefined {
  const counts = new Map<number, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  let mostCommon: number | undefined
  let highestCount = 0
  for (const [value, count] of counts) {
    if (count > highestCount) {
      mostCommon = value
      highestCount = count
    }
  }
  return mostCommon
}

async function fetchDailyRecords(
  endpoint: string,
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  signal: AbortSignal,
  forecast = false,
): Promise<DailyWeatherRecord[]> {
  const url = new URL(endpoint)
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    ...(forecast
      ? {
          forecast_days: String(FORECAST_DAYS),
          daily: 'temperature_2m_max,temperature_2m_min,weather_code',
        }
      : {
          start_date: startDate,
          end_date: endDate,
          daily: 'temperature_2m_max,temperature_2m_min,weather_code',
        }),
    temperature_unit: 'celsius',
    timezone: LOCAL_TIME_ZONE,
  }).toString()

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch {
    if (signal.aborted) throw new Error('Weather request was cancelled.')
    throw new Error('Could not connect to the weather service.')
  }
  if (!response.ok) {
    throw new Error(`The weather service is temporarily unavailable (HTTP ${response.status}).`)
  }

  let payload: DailyResponse
  try {
    payload = (await response.json()) as DailyResponse
  } catch {
    throw new Error('The weather service returned an unreadable response.')
  }
  if (payload.error === true) {
    throw new Error(
      typeof payload.reason === 'string'
        ? payload.reason
        : 'The provider could not return daily weather data.',
    )
  }

  const daily = payload.daily
  const times = daily?.time
  const maximums = daily?.temperature_2m_max
  const minimums = daily?.temperature_2m_min
  const weatherCodes = daily?.weather_code
  if (
    !isStringArray(times) ||
    !isNullableNumberArray(maximums) ||
    !isNullableNumberArray(minimums) ||
    !isNullableNumberArray(weatherCodes) ||
    times.length !== maximums.length ||
    times.length !== minimums.length ||
    times.length !== weatherCodes.length ||
    !times.every(isCalendarDate)
  ) {
    throw new Error('The weather service returned incomplete or invalid daily data.')
  }

  return times.flatMap((date, index) => {
    const temperatureMaxC = maximums[index]
    const temperatureMinC = minimums[index]
    const rawWeatherCode = weatherCodes[index]
    if (
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
      return []
    }

    return [
      {
        date,
        temperatureMaxC,
        temperatureMinC,
        weatherCode:
          typeof rawWeatherCode === 'number' &&
          Number.isInteger(rawWeatherCode) &&
          rawWeatherCode >= 0 &&
          rawWeatherCode <= 99
            ? rawWeatherCode
            : undefined,
      },
    ]
  })
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isNullableNumberArray(value: unknown): value is Array<number | null> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => item === null || (typeof item === 'number' && Number.isFinite(item)),
    )
  )
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

function addDays(date: string, offset: number): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + offset)
  return parsed.toISOString().slice(0, 10)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown weather-service error.'
}
