import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  CITY_POPULATION_LICENSE,
  CITY_POPULATION_MINIMUM,
  CITY_POPULATION_SOURCE,
  CITY_POPULATION_YEAR,
  cityDashboardData,
  findNearestCity,
  type CityDashboardData,
} from './data/cities'
import {
  fetchCurrentWeather,
  formatObservationTime,
  getWeatherCondition,
  getWeatherIcon,
  getWindDirection,
  toObservationDateTime,
  type CurrentWeather,
} from './services/openMeteo'
import {
  fetchCurrentAirQuality,
  getPrimaryPollutant,
  getUsAqiCategory,
  type CurrentAirQuality,
} from './services/openMeteoAirQuality'
import {
  fetchMonthlyWeather,
  formatForecastMonth,
  getInitialForecastMonth,
  shiftForecastMonth,
  type MonthlyWeatherData,
} from './services/openMeteoMonthly'
import { AirQualityHistoryChart } from './components/AirQualityHistoryChart'
import { MetroCityAqiTiles } from './components/MetroCityAqiTiles'
import { HealthAdviceSection } from './components/HealthAdviceSection'
import { hasCityLandmark } from './data/metroCities'
import './App.css'

const populationFormatter = new Intl.NumberFormat('en-IN')
const forecastWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type AirQualityPollutantKey = Exclude<
  keyof CurrentAirQuality,
  'usAqi' | 'modelTime'
>
type AirQualityPollutant = {
  key: AirQualityPollutantKey
  symbol: string
  label: string
}

const airQualityPollutants: AirQualityPollutant[] = [
  { key: 'pm25', symbol: 'PM2.5', label: 'Fine particles' },
  { key: 'pm10', symbol: 'PM10', label: 'Inhalable particles' },
  { key: 'carbonMonoxide', symbol: 'CO', label: 'Carbon monoxide' },
  { key: 'sulphurDioxide', symbol: 'SO₂', label: 'Sulfur dioxide' },
  { key: 'nitrogenDioxide', symbol: 'NO₂', label: 'Nitrogen dioxide' },
  { key: 'ozone', symbol: 'O₃', label: 'Ozone' },
]

type DashboardTab = 'weather' | 'aqi'
type WeatherLoadState =
  | { cityId: string; status: 'loading' }
  | { cityId: string; status: 'success'; weather: CurrentWeather }
  | { cityId: string; status: 'error'; message: string }
type AirQualityLoadState =
  | { cityId: string; status: 'loading' }
  | { cityId: string; status: 'success'; airQuality: CurrentAirQuality }
  | { cityId: string; status: 'error'; message: string }
type MonthlyWeatherLoadState =
  | { cityId: string; month: string; status: 'loading' }
  | {
      cityId: string
      month: string
      status: 'success'
      weather: MonthlyWeatherData
    }
  | { cityId: string; month: string; status: 'error'; message: string }

function formatForecastDayLabel(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function getForecastSourceLabel(
  source: MonthlyWeatherData['days'][number]['source'],
): string {
  switch (source) {
    case 'historical':
      return 'Historical reanalysis'
    case 'forecast':
      return 'Forecast'
    case 'typical':
      return 'Typical conditions'
    case 'unavailable':
      return 'Data unavailable'
  }
}

function getAqiCategoryGuidance(category: string | null): string | null {
  switch (category) {
    case 'Good':
      return 'Air quality is satisfactory, and air pollution poses little or no risk.'
    case 'Moderate':
      return 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.'
    case 'Unhealthy for Sensitive Groups':
      return 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.'
    case 'Unhealthy':
      return 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.'
    case 'Very Unhealthy':
      return 'Health alert: the risk of health effects is increased for everyone.'
    case 'Hazardous':
      return 'Health warning of emergency conditions: everyone is more likely to be affected.'
    default:
      return null
  }
}

function getInitialCity(): CityDashboardData {
  const city = cityDashboardData.find((item) => item.id === 'delhi')
  if (!city) {
    throw new Error('The Delhi city is missing from the city data.')
  }
  return city
}

const defaultCity = getInitialCity()
const initialForecastMonth = getInitialForecastMonth()

function getCityFromUrl(): CityDashboardData {
  if (typeof window === 'undefined') return defaultCity
  const params = new URLSearchParams(window.location.search)
  const cityParam = params.get('city')?.toLowerCase().trim()
  if (!cityParam) return defaultCity

  const found = cityDashboardData.find(
    (item) =>
      item.id.toLowerCase() === cityParam ||
      item.city.toLowerCase() === cityParam ||
      item.searchAliases?.some((alias) => alias.toLowerCase() === cityParam),
  )
  return found ?? defaultCity
}

function getTabFromUrl(): DashboardTab {
  if (typeof window === 'undefined') return 'aqi'
  const params = new URLSearchParams(window.location.search)
  const tabParam = params.get('tab')?.toLowerCase().trim()
  return tabParam === 'weather' ? 'weather' : 'aqi'
}

function App() {
  const [selectedCity, setSelectedCity] = useState<CityDashboardData>(() =>
    getCityFromUrl(),
  )
  const [citySearch, setCitySearch] = useState('')
  const [isCityListOpen, setIsCityListOpen] = useState(false)
  const [activeCityIndex, setActiveCityIndex] = useState(-1)
  const [locationState, setLocationState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error'
    message: string
  }>({ status: 'idle', message: '' })
  const [activeTab, setActiveTab] = useState<DashboardTab>(() =>
    getTabFromUrl(),
  )
  const [forecastMonth, setForecastMonth] = useState(initialForecastMonth)
  const [forecastRefreshVersion, setForecastRefreshVersion] = useState(0)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [airQualityRefreshVersion, setAirQualityRefreshVersion] = useState(0)
  const [weatherState, setWeatherState] = useState<WeatherLoadState>(() => ({
    cityId: getCityFromUrl().id,
    status: 'loading',
  }))
  const [airQualityState, setAirQualityState] = useState<AirQualityLoadState>(
    () => ({
      cityId: getCityFromUrl().id,
      status: 'loading',
    }),
  )
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const [monthlyWeatherState, setMonthlyWeatherState] =
    useState<MonthlyWeatherLoadState>(() => ({
      cityId: getCityFromUrl().id,
      month: initialForecastMonth,
      status: 'loading',
    }))
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([null, null])
  const locationRequestId = useRef(0)

  // Update document title for bookmarking
  useEffect(() => {
    document.title = `${selectedCity.city} Air Quality & Weather · BreatheSafe`
  }, [selectedCity.city])

  // Sync city & tab to URL search params
  useEffect(() => {
    const url = new URL(window.location.href)
    const currentCityParam = url.searchParams.get('city')
    const currentTabParam = url.searchParams.get('tab')

    const targetCityParam = selectedCity.id
    const targetTabParam = activeTab === 'weather' ? 'weather' : null

    const cityChanged = currentCityParam !== targetCityParam
    const tabChanged = (currentTabParam ?? null) !== targetTabParam

    if (!cityChanged && !tabChanged) return

    url.searchParams.set('city', targetCityParam)
    if (targetTabParam) {
      url.searchParams.set('tab', targetTabParam)
    } else {
      url.searchParams.delete('tab')
    }

    // Push new history entry if city changed; replaceState if only tab changed
    if (cityChanged && currentCityParam !== null) {
      window.history.pushState(
        { cityId: selectedCity.id, tab: activeTab },
        '',
        url.toString(),
      )
    } else {
      window.history.replaceState(
        { cityId: selectedCity.id, tab: activeTab },
        '',
        url.toString(),
      )
    }
  }, [selectedCity.id, activeTab])

  // Handle browser Back / Forward (popstate)
  useEffect(() => {
    function handlePopState() {
      const city = getCityFromUrl()
      const tab = getTabFromUrl()
      setSelectedCity(city)
      setActiveTab(tab)
      setCitySearch('')
      setIsCityListOpen(false)
      setLocationState({ status: 'idle', message: '' })
      setWeatherState({ cityId: city.id, status: 'loading' })
      setAirQualityState({ cityId: city.id, status: 'loading' })
      setMonthlyWeatherState({
        cityId: city.id,
        month: initialForecastMonth,
        status: 'loading',
      })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 15_000)

    void Promise.resolve()
      .then(() => {
        if (!active) return null
        return fetchCurrentWeather(
          selectedCity.latitude,
          selectedCity.longitude,
          controller.signal,
        )
      })
      .then((weather) => {
        if (!weather) return
        if (active) {
          setWeatherState({
            cityId: selectedCity.id,
            status: 'success',
            weather,
          })
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        setWeatherState({
          cityId: selectedCity.id,
          status: 'error',
          message: timedOut
            ? 'The weather request timed out. Please try again.'
            : error instanceof Error
              ? error.message
              : 'Unable to load current weather. Please try again.',
        })
      })
      .finally(() => window.clearTimeout(timeoutId))

    return () => {
      active = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [
    refreshVersion,
    selectedCity.id,
    selectedCity.latitude,
    selectedCity.longitude,
  ])

  useEffect(() => {
    if (activeTab !== 'aqi') return

    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 15_000)

    void Promise.resolve()
      .then(() => {
        if (!active) return null
        return fetchCurrentAirQuality(
          selectedCity.latitude,
          selectedCity.longitude,
          controller.signal,
        )
      })
      .then((airQuality) => {
        if (!airQuality) return
        if (active) {
          setAirQualityState({
            cityId: selectedCity.id,
            status: 'success',
            airQuality,
          })
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        setAirQualityState({
          cityId: selectedCity.id,
          status: 'error',
          message: timedOut
            ? 'The air-quality request timed out. Please try again.'
            : error instanceof Error
              ? error.message
              : 'Unable to load current air quality. Please try again.',
        })
      })
      .finally(() => window.clearTimeout(timeoutId))

    return () => {
      active = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [
    activeTab,
    airQualityRefreshVersion,
    selectedCity.id,
    selectedCity.latitude,
    selectedCity.longitude,
  ])

  useEffect(() => {
    if (activeTab !== 'weather') return

    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 30_000)

    void Promise.resolve()
      .then(() => {
        if (!active) return null
        return fetchMonthlyWeather(
          selectedCity.latitude,
          selectedCity.longitude,
          forecastMonth,
          controller.signal,
        )
      })
      .then((weather) => {
        if (!weather || !active) return
        setMonthlyWeatherState({
          cityId: selectedCity.id,
          month: forecastMonth,
          status: 'success',
          weather,
        })
      })
      .catch((error: unknown) => {
        if (!active) return
        setMonthlyWeatherState({
          cityId: selectedCity.id,
          month: forecastMonth,
          status: 'error',
          message: timedOut
            ? 'The monthly weather request timed out. Please try again.'
            : error instanceof Error
              ? error.message
              : 'Unable to load the monthly weather. Please try again.',
        })
      })
      .finally(() => window.clearTimeout(timeoutId))

    return () => {
      active = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [
    activeTab,
    forecastMonth,
    forecastRefreshVersion,
    selectedCity.id,
    selectedCity.latitude,
    selectedCity.longitude,
  ])

  function selectTab(tab: DashboardTab) {
    if (tab === 'aqi' && activeTab !== 'aqi') {
      setAirQualityState({ cityId: selectedCity.id, status: 'loading' })
    }
    if (tab === 'weather' && activeTab !== 'weather') {
      setMonthlyWeatherState({
        cityId: selectedCity.id,
        month: forecastMonth,
        status: 'loading',
      })
    }
    setActiveTab(tab)
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % 2
        break
      case 'ArrowLeft':
        nextIndex = (currentIndex + 1) % 2
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = 1
        break
      default:
        return
    }

    event.preventDefault()
    selectTab(nextIndex === 0 ? 'aqi' : 'weather')
    tabRefs.current[nextIndex]?.focus()
  }

  const selectedAirQualityState =
    airQualityState.cityId === selectedCity.id ? airQualityState : null
  const aqiCategory =
    selectedAirQualityState?.status === 'success'
      ? getUsAqiCategory(Math.round(selectedAirQualityState.airQuality.usAqi))
      : null
  const aqiCategoryGuidance = getAqiCategoryGuidance(aqiCategory)
  const aqiIllustration = aqiCategory?.toLowerCase().replace(/\s+/g, '-') ?? null
  const selectedWeatherState =
    weatherState.cityId === selectedCity.id ? weatherState : null
  const selectedMonthlyWeatherState =
    monthlyWeatherState.cityId === selectedCity.id &&
    monthlyWeatherState.month === forecastMonth
      ? monthlyWeatherState
      : null
  const normalizedSearch = citySearch.trim().toLocaleLowerCase()
  const hasMinimumSearchLength = normalizedSearch.length >= 3
  const matchingCities = hasMinimumSearchLength
    ? cityDashboardData
        .filter((city) =>
          [city.city, city.state, ...(city.searchAliases ?? [])].some((value) =>
            value.toLocaleLowerCase().includes(normalizedSearch),
          ),
        )
        .sort((left, right) => {
          const leftNameStartsWithQuery = [
            left.city,
            ...(left.searchAliases ?? []),
          ].some((value) =>
            value.toLocaleLowerCase().startsWith(normalizedSearch),
          )
          const rightNameStartsWithQuery = [
            right.city,
            ...(right.searchAliases ?? []),
          ].some((value) =>
            value.toLocaleLowerCase().startsWith(normalizedSearch),
          )

          if (leftNameStartsWithQuery !== rightNameStartsWithQuery) {
            return leftNameStartsWithQuery ? -1 : 1
          }

          return left.city.localeCompare(right.city)
        })
        .slice(0, 8)
    : []

  function selectCity(city: CityDashboardData) {
    locationRequestId.current += 1
    setSelectedCity(city)
    setCitySearch('')
    setIsCityListOpen(false)
    setActiveCityIndex(-1)
    setLocationState({ status: 'idle', message: '' })
    setWeatherState({ cityId: city.id, status: 'loading' })
    setAirQualityState({ cityId: city.id, status: 'loading' })
    setMonthlyWeatherState({
      cityId: city.id,
      month: forecastMonth,
      status: 'loading',
    })
  }

  function changeForecastMonth(offset: number) {
    const month = shiftForecastMonth(forecastMonth, offset)
    if (month < '1940-01') return
    setForecastMonth(month)
    setMonthlyWeatherState({
      cityId: selectedCity.id,
      month,
      status: 'loading',
    })
  }

  const forecastMonthStart = new Date(`${forecastMonth}-01T00:00:00Z`)
  const forecastMonthDayOffset = forecastMonthStart.getUTCDay()

  function handleCitySearchKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === 'ArrowDown' && matchingCities.length > 0) {
      event.preventDefault()
      setIsCityListOpen(true)
      setActiveCityIndex((index) =>
        index < 0 ? 0 : (index + 1) % matchingCities.length,
      )
    } else if (event.key === 'ArrowUp' && matchingCities.length > 0) {
      event.preventDefault()
      setIsCityListOpen(true)
      setActiveCityIndex(
        (index) =>
          index < 0
            ? matchingCities.length - 1
            : (index - 1 + matchingCities.length) % matchingCities.length,
      )
    } else if (
      event.key === 'Enter' &&
      isCityListOpen &&
      matchingCities[activeCityIndex] !== undefined
    ) {
      event.preventDefault()
      selectCity(matchingCities[activeCityIndex])
    } else if (
      event.key === 'Enter' &&
      isCityListOpen &&
      matchingCities.length > 0
    ) {
      event.preventDefault()
      selectCity(matchingCities[0])
    } else if (event.key === 'Escape') {
      setIsCityListOpen(false)
      setCitySearch('')
    }
  }

  function requestDeviceLocation() {
    setIsCityListOpen(false)
    const requestId = ++locationRequestId.current

    if (!navigator.geolocation) {
      setLocationState({
        status: 'error',
        message: 'Location is not available in this browser.',
      })
      return
    }

    setLocationState({
      status: 'loading',
      message: 'Finding the nearest supported city…',
    })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== locationRequestId.current) return
        const city = findNearestCity(
          position.coords.latitude,
          position.coords.longitude,
        )
        selectCity(city)
        setLocationState({
          status: 'success',
          message: `Showing ${city.city}, ${city.state}, the nearest supported city.`,
        })
      },
      (error) => {
        if (requestId !== locationRequestId.current) return
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Choose a city or allow location access in your browser.'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'Your device could not determine your location. Choose a city and try again later.'
              : 'Location lookup timed out. Check your connection or choose a city.'
        setLocationState({ status: 'error', message })
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 15_000 },
    )
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <a className="brand" href="/" aria-label="BreatheSafe home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="M25.2 6.8C14.3 7.4 7 12.7 7 20.1c0 3.2 2.2 5.3 5.5 5.3 7.7 0 11.6-9.2 12.7-18.6Z"
                fill="currentColor"
              />
              <path
                d="M7.8 25c3.1-5.8 7.1-9.3 13.1-12.4"
                stroke="white"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          <span>BreatheSafe</span>
        </a>

        <div className="city-picker">
          <label className="city-search-label" htmlFor="city-search">
            Search cities
          </label>
          <div className="city-search-wrap">
            <div className="city-search-box">
              <span className="city-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4.2 4.2" />
                </svg>
              </span>
              <input
                id="city-search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isCityListOpen && hasMinimumSearchLength}
                aria-controls="city-results"
                aria-activedescendant={
                  isCityListOpen &&
                  hasMinimumSearchLength &&
                  matchingCities[activeCityIndex]
                    ? `city-option-${matchingCities[activeCityIndex].id}`
                    : undefined
                }
                autoComplete="off"
                placeholder="Search Indian cities or states"
                value={citySearch}
                onChange={(event) => {
                  locationRequestId.current += 1
                  setCitySearch(event.target.value)
                  setActiveCityIndex(-1)
                  setIsCityListOpen(event.target.value.trim().length >= 3)
                  setLocationState({ status: 'idle', message: '' })
                }}
                onFocus={() =>
                  setIsCityListOpen(hasMinimumSearchLength)
                }
                onBlur={() => setIsCityListOpen(false)}
                onKeyDown={handleCitySearchKeyDown}
              />
              {citySearch && (
                <button
                  className="city-search-clear"
                  type="button"
                  aria-label="Clear city search"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    locationRequestId.current += 1
                    setCitySearch('')
                    setActiveCityIndex(-1)
                    setIsCityListOpen(false)
                    setLocationState({ status: 'idle', message: '' })
                  }}
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
              <button
                className="city-location-button"
                type="button"
                aria-label="Use my location"
                title="Use my location"
                disabled={locationState.status === 'loading'}
                onMouseDown={(event) => event.preventDefault()}
                onClick={requestDeviceLocation}
              >
                {locationState.status === 'loading' ? (
                  <span className="location-spinner" aria-hidden="true" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3" />
                  </svg>
                )}
              </button>
            </div>
            <div
              className={
                isCityListOpen && hasMinimumSearchLength
                  ? 'city-results-panel open'
                  : 'city-results-panel'
              }
              aria-hidden={!isCityListOpen || !hasMinimumSearchLength}
            >
              <p className="city-results-heading">Suggestions</p>
              <p className="city-results-subheading">
                {cityDashboardData.length} cities · {CITY_POPULATION_YEAR}{' '}
                population · {populationFormatter.format(CITY_POPULATION_MINIMUM)}+
              </p>
              <ul
                className="city-results"
                id="city-results"
                role="listbox"
                aria-label="Matching cities"
              >
                {matchingCities.length > 0 ? (
                  matchingCities.map((city, index) => (
                    <li
                      className={
                        index === activeCityIndex
                          ? 'city-result active'
                          : 'city-result'
                      }
                      id={`city-option-${city.id}`}
                      key={city.id}
                      role="option"
                      aria-selected={city.id === selectedCity.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveCityIndex(index)}
                      onClick={() => selectCity(city)}
                    >
                      <span className="city-result-name">
                        <span className="city-result-pin" aria-hidden="true">
                          <svg viewBox="0 0 24 16" fill="none">
                            <path fill="#FF9933" d="M1 1h22v4.67H1z" />
                            <path fill="white" d="M1 5.67h22v4.66H1z" />
                            <path fill="#138808" d="M1 10.33h22V15H1z" />
                            <circle
                              cx="12"
                              cy="8"
                              r="1.65"
                              stroke="#1A4A9F"
                              strokeWidth=".7"
                            />
                            <path
                              d="M12 6.5v3M10.5 8h3"
                              stroke="#1A4A9F"
                              strokeWidth=".45"
                            />
                          </svg>
                        </span>
                        <span>
                          {city.city}, {city.state}
                        </span>
                        <span className="city-result-population">
                          {populationFormatter.format(city.population)}
                          <small>{CITY_POPULATION_YEAR} population</small>
                        </span>
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="city-no-results" role="option" aria-disabled="true">
                    No matching cities found.
                  </li>
                )}
              </ul>
            </div>
          </div>
          <p
            className={`city-picker-message ${locationState.status}`}
            role={
              locationState.status === 'idle'
                ? undefined
                : locationState.status === 'error'
                  ? 'alert'
                  : 'status'
            }
            aria-hidden={locationState.status === 'idle'}
          >
            {locationState.message}
          </p>
        </div>
      </header>

      <main className="main-content">
        <div className="location-heading">
          <p className="eyebrow">India city dashboard</p>
          <div className="location-title-row">
            {hasCityLandmark(selectedCity.id) && (
              <img
                className="location-landmark"
                src={`/cities/${selectedCity.id}.webp`}
                alt=""
                width="84"
                height="64"
                loading="eager"
              />
            )}
            <div className="location-title-text">
              <h1>
                {selectedCity.city}
                <span className="heading-comma">, </span>
                <span className="state-name">{selectedCity.state}</span>
              </h1>
              <p className="location-subtitle">
                A simple snapshot of the weather and air around your city.
              </p>
            </div>
          </div>
          <details className="city-details">
            <summary>City information</summary>
            <p className="city-population">
              {CITY_POPULATION_YEAR} Census population:{' '}
              <strong>
                {populationFormatter.format(selectedCity.population)}
              </strong>
            </p>
          </details>
        </div>

        <div
          className="data-notice"
          role="note"
          aria-label="Air quality data limitations"
        >
          <span className="data-notice-dot" aria-hidden="true" />
          <span>
            <strong>Air quality · Model-based estimates</strong>
            <span className="notice-detail">
              US AQI is not CPCB India AQI or a local monitoring-station reading.
            </span>
          </span>
        </div>

        <section className="dashboard-card" aria-label="City conditions">
          <div className="tab-list" role="tablist" aria-label="Condition type">
            <button
              ref={(element) => {
                tabRefs.current[0] = element
              }}
              id="aqi-tab"
              className="tab"
              type="button"
              role="tab"
              aria-selected={activeTab === 'aqi'}
              aria-controls="aqi-panel"
              tabIndex={activeTab === 'aqi' ? 0 : -1}
              onClick={() => selectTab('aqi')}
              onKeyDown={(event) => handleTabKeyDown(event, 0)}
            >
              <span className="tab-icon aqi-tab-icon" aria-hidden="true">
                ◉
              </span>
              Air quality
            </button>
            <button
              ref={(element) => {
                tabRefs.current[1] = element
              }}
              id="weather-tab"
              className="tab"
              type="button"
              role="tab"
              aria-selected={activeTab === 'weather'}
              aria-controls="weather-panel forecast-panel"
              tabIndex={activeTab === 'weather' ? 0 : -1}
              onClick={() => selectTab('weather')}
              onKeyDown={(event) => handleTabKeyDown(event, 1)}
            >
              <span className="tab-icon weather-tab-icon" aria-hidden="true">
                ☀
              </span>
              Weather
            </button>
          </div>

          <div
            id="weather-panel"
            className="tab-panel weather-panel"
            role="tabpanel"
            aria-labelledby="weather-tab"
            hidden={activeTab !== 'weather'}
            tabIndex={0}
          >
            <div className="weather-overview">
              <div>
                <p className="panel-kicker">Current weather · Model-based</p>
                {selectedWeatherState?.status === 'success' ? (
                  <>
                    <p
                      className="temperature"
                      aria-label={`${Math.round(selectedWeatherState.weather.temperatureC)} degrees Celsius`}
                    >
                      {Math.round(selectedWeatherState.weather.temperatureC)}
                      <span>°C</span>
                    </p>
                    <p className="weather-condition">
                      {getWeatherCondition(
                        selectedWeatherState.weather.weatherCode,
                      )}
                    </p>
                    <p className="city-caption">
                      {selectedCity.city}, {selectedCity.state}
                    </p>
                    <p className="weather-range">
                      High: {Math.round(selectedWeatherState.weather.temperatureMaxC)}°C
                      <span aria-hidden="true"> · </span>
                      Low: {Math.round(selectedWeatherState.weather.temperatureMinC)}°C
                    </p>
                  </>
                ) : null}
              </div>
              <div
                className="weather-illustration"
                aria-hidden="true"
              >
                {selectedWeatherState?.status === 'success' ? (
                  <span className="weather-symbol">
                    {getWeatherIcon(selectedWeatherState.weather.weatherCode)}
                  </span>
                ) : null}
              </div>
            </div>

            {selectedWeatherState?.status === 'loading' ? (
              <div className="weather-state" role="status" aria-live="polite">
                <span className="loading-spinner" aria-hidden="true" />
                Loading current weather for {selectedCity.city}…
              </div>
            ) : null}

            {selectedWeatherState?.status === 'error' ? (
              <div className="weather-error" role="alert">
                <p>{selectedWeatherState.message}</p>
                <button
                  className="retry-button"
                  type="button"
                  onClick={() => {
                    setWeatherState({
                      cityId: selectedCity.id,
                      status: 'loading',
                    })
                    setRefreshVersion((version) => version + 1)
                  }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {selectedWeatherState?.status === 'success' ? (
              <>
                <div className="detail-grid">
                  <article className="detail-card">
                    <span
                      className="detail-icon humidity-icon"
                      aria-hidden="true"
                    >
                      ◌
                    </span>
                    <div>
                      <p className="detail-label">Relative humidity</p>
                      <p className="detail-value">
                        {selectedWeatherState.weather.relativeHumidity}
                        <span>%</span>
                      </p>
                    </div>
                  </article>
                  <article className="detail-card">
                    <span className="detail-icon wind-icon" aria-hidden="true">
                      ≋
                    </span>
                    <div>
                      <p className="detail-label">Wind</p>
                      <p className="detail-value">
                        {Math.round(selectedWeatherState.weather.windSpeedKph)}
                        <span> km/h</span>
                      </p>
                      <p className="detail-caption">
                        {getWindDirection(
                          selectedWeatherState.weather.windDirectionDegrees,
                        )}{' '}
                        direction
                      </p>
                    </div>
                  </article>
                  <article className="detail-card">
                    <span className="detail-icon feels-like-icon" aria-hidden="true">
                      ≈
                    </span>
                    <div>
                      <p className="detail-label">Feels like</p>
                      <p className="detail-value">
                        {Math.round(selectedWeatherState.weather.apparentTemperatureC)}
                        <span>°C</span>
                      </p>
                    </div>
                  </article>
                  <article className="detail-card">
                    <span className="detail-icon rain-icon" aria-hidden="true">
                      ☂
                    </span>
                    <div>
                      <p className="detail-label">Chance of rain</p>
                      <p className="detail-value">
                        {selectedWeatherState.weather.precipitationProbability}
                        <span>%</span>
                      </p>
                    </div>
                  </article>
                </div>

              </>
            ) : null}
          </div>

          <div
            id="aqi-panel"
            className="tab-panel"
            role="tabpanel"
            aria-labelledby="aqi-tab"
            hidden={activeTab !== 'aqi'}
            tabIndex={0}
          >
            <div
              className="aqi-overview"
              data-aqi-category={aqiCategory?.toLowerCase().replace(/\s+/g, '-')}
            >
              <div>
                <p className="panel-kicker">Current air quality · US AQI</p>
                {selectedAirQualityState?.status === 'success' ? (
                  <>
                    <p className="aqi-value">
                      {Math.round(selectedAirQualityState.airQuality.usAqi)}
                    </p>
                    <p className="aqi-category">{aqiCategory}</p>
                    <p className="city-caption">United States AQI scale</p>
                    <p className="observation-time aqi-model-time">
                      Model time{' '}
                      <time
                        dateTime={toObservationDateTime(
                          selectedAirQualityState.airQuality.modelTime,
                        )}
                      >
                        {formatObservationTime(
                          selectedAirQualityState.airQuality.modelTime,
                        )}{' '}
                        IST
                      </time>
                    </p>
                  </>
                ) : null}
              </div>
              {selectedAirQualityState?.status === 'success' &&
              aqiIllustration ? (
                <div className="aqi-illustration-column">
                  <div className="aqi-illustration-frame" aria-hidden="true">
                    <img
                      className="aqi-illustration"
                      src={`/aqi-${aqiIllustration}.webp`}
                      alt=""
                    />
                    <div className="aqi-illustration-caption">
                      <span>US AQI</span>
                      <span>model estimate</span>
                    </div>
                  </div>
                  <div
                    className="aqi-share-icons-row"
                    role="group"
                    aria-label="Share air quality"
                  >
                    <button
                      type="button"
                      className="share-icon-btn"
                      aria-label="Share on X"
                      title="Share on X"
                      onClick={() => {
                        const shareUrl = new URL(window.location.href)
                        shareUrl.searchParams.set('city', selectedCity.id)
                        if (activeTab === 'weather') {
                          shareUrl.searchParams.set('tab', 'weather')
                        } else {
                          shareUrl.searchParams.delete('tab')
                        }
                        const text = `${selectedCity.city}'s Air Quality is ${Math.round(selectedAirQualityState.airQuality.usAqi)} (${aqiCategory}) on BreatheSafe · PM2.5: ${selectedAirQualityState.airQuality.pm25.toFixed(1)} µg/m³.`
                        window.open(
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl.toString())}`,
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="share-icon-btn"
                      aria-label="Share on Facebook"
                      title="Share on Facebook"
                      onClick={() => {
                        const shareUrl = new URL(window.location.href)
                        shareUrl.searchParams.set('city', selectedCity.id)
                        if (activeTab === 'weather') {
                          shareUrl.searchParams.set('tab', 'weather')
                        } else {
                          shareUrl.searchParams.delete('tab')
                        }
                        window.open(
                          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.toString())}`,
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="share-icon-btn"
                      aria-label="Share on Instagram"
                      title="Share on Instagram (copies caption & link)"
                      onClick={async () => {
                        const shareUrl = new URL(window.location.href)
                        shareUrl.searchParams.set('city', selectedCity.id)
                        if (activeTab === 'weather') {
                          shareUrl.searchParams.set('tab', 'weather')
                        } else {
                          shareUrl.searchParams.delete('tab')
                        }
                        const text = `${selectedCity.city}'s Air Quality is ${Math.round(selectedAirQualityState.airQuality.usAqi)} (${aqiCategory}) on BreatheSafe · PM2.5: ${selectedAirQualityState.airQuality.pm25.toFixed(1)} µg/m³.`
                        if (navigator.clipboard) {
                          await navigator.clipboard.writeText(
                            `${text}\n${shareUrl.toString()}`,
                          )
                          setShareFeedback('Copied for Instagram!')
                          setTimeout(() => setShareFeedback(null), 2500)
                        }
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: `${selectedCity.city} Air Quality · BreatheSafe`,
                              text,
                              url: shareUrl.toString(),
                            })
                          } catch {
                            // dismissed
                          }
                        }
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="share-icon-btn"
                      aria-label="Copy link"
                      title="Copy link"
                      onClick={async () => {
                        const shareUrl = new URL(window.location.href)
                        shareUrl.searchParams.set('city', selectedCity.id)
                        if (activeTab === 'weather') {
                          shareUrl.searchParams.set('tab', 'weather')
                        } else {
                          shareUrl.searchParams.delete('tab')
                        }
                        const text = `${selectedCity.city}'s Air Quality is ${Math.round(selectedAirQualityState.airQuality.usAqi)} (${aqiCategory}) on BreatheSafe · PM2.5: ${selectedAirQualityState.airQuality.pm25.toFixed(1)} µg/m³.`
                        if (navigator.clipboard) {
                          await navigator.clipboard.writeText(
                            `${text}\n${shareUrl.toString()}`,
                          )
                          setShareFeedback('Link copied!')
                          setTimeout(() => setShareFeedback(null), 2500)
                        }
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </button>
                  </div>
                  {shareFeedback && (
                    <span className="share-feedback-toast" role="status">
                      {shareFeedback}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {selectedAirQualityState?.status === 'loading' ? (
              <div className="aqi-state" role="status" aria-live="polite">
                <span className="loading-spinner" aria-hidden="true" />
                Loading current air quality for {selectedCity.city}…
              </div>
            ) : null}

            {selectedAirQualityState?.status === 'error' ? (
              <div className="aqi-error" role="alert">
                <p>{selectedAirQualityState.message}</p>
                <button
                  className="retry-button"
                  type="button"
                  onClick={() => {
                    setAirQualityState({
                      cityId: selectedCity.id,
                      status: 'loading',
                    })
                    setAirQualityRefreshVersion((version) => version + 1)
                  }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {selectedAirQualityState?.status === 'success' ? (
              <>
                {aqiCategoryGuidance ? (
                  <details className="aqi-guidance">
                    <summary>What does this AQI category mean?</summary>
                    <p>{aqiCategoryGuidance}</p>
                    <a
                      href="https://www.airnow.gov/aqi/aqi-basics/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      AirNow: AQI Basics
                    </a>
                  </details>
                ) : null}
                <section
                  className="pollutant-section"
                  aria-labelledby="pollutants-heading"
                >
                  <h2 className="pollutant-heading" id="pollutants-heading">
                    Major air pollutants
                  </h2>
                  <div className="detail-grid pollutant-grid">
                    {airQualityPollutants.map(({ key, symbol, label }) => {
                      const isPrimary =
                        selectedAirQualityState.status === 'success' &&
                        getPrimaryPollutant(selectedAirQualityState.airQuality).key === key
                      return (
                        <article
                          className={`detail-card pollutant-card ${isPrimary ? 'primary-pollutant' : ''}`}
                          key={key}
                        >
                          <span className="pollutant-tag">{symbol}</span>
                          <div className="pollutant-info">
                            <div className="pollutant-label-row">
                              <p className="detail-label">{label}</p>
                              {isPrimary && (
                                <span
                                  className="primary-tag"
                                  title="Main contributor to today's AQI"
                                >
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="detail-value">
                              {selectedAirQualityState.airQuality[key].toFixed(1)}
                              <span> µg/m³</span>
                            </p>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>

                <HealthAdviceSection
                  cityName={selectedCity.city}
                  usAqi={selectedAirQualityState.airQuality.usAqi}
                  pm25={selectedAirQualityState.airQuality.pm25}
                />

                <AirQualityHistoryChart
                  active={activeTab === 'aqi'}
                  cityId={selectedCity.id}
                  cityName={selectedCity.city}
                  latitude={selectedCity.latitude}
                  longitude={selectedCity.longitude}
                  refreshVersion={airQualityRefreshVersion}
                />

                <MetroCityAqiTiles
                  cities={cityDashboardData}
                  active={activeTab === 'aqi'}
                  currentCityAqi={
                    selectedAirQualityState.status === 'success'
                      ? Math.round(selectedAirQualityState.airQuality.usAqi)
                      : undefined
                  }
                  currentCityName={selectedCity.city}
                  onCitySelect={(city) => {
                    setSelectedCity(city)
                    setCitySearch('')
                    setIsCityListOpen(false)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />

                <div className="weather-meta">
                  <a
                    className="weather-attribution"
                    href="https://open-meteo.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Air quality data by Open-Meteo
                  </a>
                  <a
                    className="weather-attribution"
                    href="https://open-meteo.com/en/licence"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY 4.0 licence
                  </a>
                  <button
                    className="refresh-button"
                    type="button"
                    onClick={() => {
                      setAirQualityState({
                        cityId: selectedCity.id,
                        status: 'loading',
                      })
                      setAirQualityRefreshVersion((version) => version + 1)
                    }}
                    aria-label={`Refresh air quality for ${selectedCity.city}`}
                  >
                    Refresh air quality
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div
            id="forecast-panel"
            className="tab-panel forecast-panel"
            role="region"
            aria-labelledby="forecast-heading"
            hidden={activeTab !== 'weather'}
          >
            <div className="forecast-heading">
              <div>
                <p className="panel-kicker">
                  {selectedCity.city} 30-day weather calendar
                </p>
                <h2 id="forecast-heading">
                  {formatForecastMonth(forecastMonth)}
                </h2>
                <p className="forecast-intro">
                  Up to 16 days of forecast data, followed by typical conditions
                  based on the previous 10 years.
                </p>
              </div>
              <div className="forecast-month-controls" aria-label="Choose month">
                <button
                  className="month-nav-button"
                  type="button"
                  aria-label="Previous month"
                  disabled={forecastMonth <= '1940-01'}
                  onClick={() => changeForecastMonth(-1)}
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  className="month-nav-button"
                  type="button"
                  aria-label="Next month"
                  onClick={() => changeForecastMonth(1)}
                >
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            </div>

            <div className="forecast-legend" aria-label="Weather data sources">
              <span className="forecast-legend-item historical">
                Historical reanalysis
              </span>
              <span className="forecast-legend-item forecast">
                Forecast · up to 16 days
              </span>
              <span className="forecast-legend-item typical">
                Typical · 10-year average
              </span>
              <span className="forecast-temperature-key">
                Temperatures: high / low (top to bottom)
              </span>
            </div>

            {selectedMonthlyWeatherState?.status === 'loading' ? (
              <div className="forecast-state" role="status" aria-live="polite">
                <span className="loading-spinner" aria-hidden="true" />
                Loading {formatForecastMonth(forecastMonth)} weather for{' '}
                {selectedCity.city}…
              </div>
            ) : null}

            {selectedMonthlyWeatherState?.status === 'error' ? (
              <div className="forecast-error" role="alert">
                <p>{selectedMonthlyWeatherState.message}</p>
                <button
                  className="retry-button"
                  type="button"
                  onClick={() => {
                    setMonthlyWeatherState({
                      cityId: selectedCity.id,
                      month: forecastMonth,
                      status: 'loading',
                    })
                    setForecastRefreshVersion((version) => version + 1)
                  }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {selectedMonthlyWeatherState?.status === 'success' ? (
              <>
                {selectedMonthlyWeatherState.weather.warnings.length > 0 ? (
                  <div className="forecast-warnings" role="note">
                    {selectedMonthlyWeatherState.weather.warnings.map(
                      (warning) => (
                        <p key={warning}>{warning}</p>
                      ),
                    )}
                  </div>
                ) : null}
                <div className="forecast-layout">
                  <div
                    className="forecast-calendar"
                    role="group"
                    aria-label={`Daily weather calendar for ${formatForecastMonth(forecastMonth)}`}
                  >
                    {forecastWeekdays.map((weekday) => (
                      <div className="forecast-weekday" key={weekday}>
                        {weekday}
                      </div>
                    ))}
                    {Array.from({ length: forecastMonthDayOffset }, (_, index) => (
                      <div
                        className="forecast-day-empty"
                        key={`empty-${index}`}
                        aria-hidden="true"
                      />
                    ))}
                    {selectedMonthlyWeatherState.weather.days.map((day) => {
                      const sourceLabel = getForecastSourceLabel(day.source)
                      const dayDetails =
                        day.temperatureMaxC !== undefined &&
                        day.temperatureMinC !== undefined
                          ? `High ${Math.round(day.temperatureMaxC)} degrees, low ${Math.round(day.temperatureMinC)} degrees Celsius`
                          : 'Temperature unavailable'
                      const sourceDetails =
                        day.source === 'typical' && day.sampleCount !== undefined
                          ? `, ${day.sampleCount}-year average`
                          : ''
                      return (
                        <article
                          className={`forecast-day forecast-day-${day.source}`}
                          key={day.date}
                          aria-label={`${formatForecastDayLabel(day.date)}, ${sourceLabel}${sourceDetails}, ${dayDetails}`}
                        >
                          <div className="forecast-day-header">
                            <span className="forecast-date">
                              {Number(day.date.slice(-2))}
                            </span>
                            <span className="forecast-source" aria-hidden="true">
                              {day.source === 'historical'
                                ? 'Past'
                                : day.source === 'forecast'
                                  ? 'Forecast'
                                  : day.source === 'typical'
                                    ? 'Avg'
                                    : '—'}
                            </span>
                          </div>
                          <div className="forecast-day-weather">
                            <span className="forecast-day-icon" aria-hidden="true">
                              {day.weatherCode === undefined
                                ? '–'
                                : getWeatherIcon(day.weatherCode)}
                            </span>
                            {day.temperatureMaxC !== undefined &&
                            day.temperatureMinC !== undefined ? (
                              <span className="forecast-temperatures">
                                <span>
                                  {Math.round(day.temperatureMaxC)}°
                                </span>
                                <span>
                                  {Math.round(day.temperatureMinC)}°
                                </span>
                              </span>
                            ) : (
                              <span className="forecast-unavailable">—</span>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <aside className="forecast-summary" aria-label="Monthly overview">
                    <h3>Month overview</h3>
                    <p className="forecast-summary-total">
                      {selectedMonthlyWeatherState.weather.days.length} days
                    </p>
                    <dl className="forecast-source-counts">
                      {(
                        [
                          ['historical', 'Historical reanalysis'],
                          ['forecast', 'Forecast'],
                          ['typical', 'Typical conditions'],
                          ['unavailable', 'Unavailable'],
                        ] as const
                      ).map(([source, label]) => {
                        const count =
                          selectedMonthlyWeatherState.weather.sourceCounts[source]
                        return count > 0 ? (
                          <div key={source}>
                            <dt>{label}</dt>
                            <dd>{count}</dd>
                          </div>
                        ) : null
                      })}
                    </dl>
                    <p className="forecast-summary-note">
                      Historical values are modeled ERA5 reanalysis, not station
                      observations. Typical values are date-matched averages from
                      the previous 10 completed years, not a forecast.
                    </p>
                  </aside>
                </div>
              </>
            ) : null}
          </div>

          <div
            className="weather-meta weather-footer"
            hidden={activeTab !== 'weather'}
          >
            <div className="weather-footer-details">
              {selectedWeatherState?.status === 'success' ? (
                <p className="observation-time">
                  Model time{' '}
                  <time
                    dateTime={toObservationDateTime(
                      selectedWeatherState.weather.observedAt,
                    )}
                  >
                    {formatObservationTime(
                      selectedWeatherState.weather.observedAt,
                    )}{' '}
                    IST
                  </time>
                </p>
              ) : null}
              <a
                className="weather-attribution"
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Weather data by Open-Meteo.com
              </a>
              <a
                className="weather-attribution"
                href="https://open-meteo.com/en/licence"
                target="_blank"
                rel="noreferrer"
              >
                Data licence
              </a>
            </div>
            {selectedWeatherState?.status === 'success' ? (
              <button
                className="refresh-button"
                type="button"
                onClick={() => {
                  setWeatherState({
                    cityId: selectedCity.id,
                    status: 'loading',
                  })
                  setRefreshVersion((version) => version + 1)
                }}
                aria-label={`Refresh weather for ${selectedCity.city}`}
              >
                Refresh weather
              </button>
            ) : null}
          </div>
        </section>

        <p className="data-footnote">
          Weather and air-quality conditions are model-based and may differ
          from local observations. Open-Meteo's US AQI is not CPCB India AQI or
          a reading from a local monitoring station.
        </p>
        <p className="city-data-attribution">
          City list, 2011 population figures, and coordinates adapted from{' '}
          <a
            href={CITY_POPULATION_SOURCE}
            target="_blank"
            rel="noreferrer"
          >
            Wikipedia contributors
          </a>{' '}
          under{' '}
          <a
            href={CITY_POPULATION_LICENSE}
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 4.0
          </a>
          .
        </p>
      </main>
      <footer className="page-footer">
        <span>Made for a breath of clarity</span>
        <span>India · English</span>
      </footer>
    </div>
  )
}

export default App
