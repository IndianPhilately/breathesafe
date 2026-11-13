import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  cityDashboardData,
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
  getUsAqiCategory,
  type CurrentAirQuality,
} from './services/openMeteoAirQuality'
import './App.css'

type DashboardTab = 'weather' | 'aqi'
type WeatherLoadState =
  | { cityId: string; status: 'loading' }
  | { cityId: string; status: 'success'; weather: CurrentWeather }
  | { cityId: string; status: 'error'; message: string }
type AirQualityLoadState =
  | { cityId: string; status: 'loading' }
  | { cityId: string; status: 'success'; airQuality: CurrentAirQuality }
  | { cityId: string; status: 'error'; message: string }

function getInitialCity(): CityDashboardData {
  const city = cityDashboardData.find((item) => item.id === 'pune')
  if (!city) {
    throw new Error('The Pune city is missing from the city data.')
  }
  return city
}

const initialCity = getInitialCity()

function App() {
  const [selectedCity, setSelectedCity] =
    useState<CityDashboardData>(initialCity)
  const [activeTab, setActiveTab] = useState<DashboardTab>('weather')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [airQualityRefreshVersion, setAirQualityRefreshVersion] = useState(0)
  const [weatherState, setWeatherState] = useState<WeatherLoadState>({
    cityId: initialCity.id,
    status: 'loading',
  })
  const [airQualityState, setAirQualityState] = useState<AirQualityLoadState>({
    cityId: initialCity.id,
    status: 'loading',
  })
  const tabRefs = useRef<[HTMLButtonElement | null, HTMLButtonElement | null]>([
    null,
    null,
  ])

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

  function selectTab(tab: DashboardTab) {
    if (tab === 'aqi' && activeTab !== 'aqi') {
      setAirQualityState({ cityId: selectedCity.id, status: 'loading' })
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
    selectTab(nextIndex === 0 ? 'weather' : 'aqi')
    tabRefs.current[nextIndex]?.focus()
  }

  const selectedAirQualityState =
    airQualityState.cityId === selectedCity.id ? airQualityState : null
  const aqiCategory =
    selectedAirQualityState?.status === 'success'
      ? getUsAqiCategory(Math.round(selectedAirQualityState.airQuality.usAqi))
      : null
  const selectedWeatherState =
    weatherState.cityId === selectedCity.id ? weatherState : null

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
          <label htmlFor="city-select">City</label>
          <select
            id="city-select"
            value={selectedCity.id}
            onChange={(event) => {
              const city = cityDashboardData.find(
                (item) => item.id === event.target.value,
              )
              if (city) {
                setSelectedCity(city)
                setWeatherState({ cityId: city.id, status: 'loading' })
                setAirQualityState({ cityId: city.id, status: 'loading' })
              }
            }}
          >
            {cityDashboardData.map((city) => (
              <option key={city.id} value={city.id}>
                {city.city}, {city.state}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="main-content">
        <div className="location-heading">
          <p className="eyebrow">India city dashboard</p>
          <h1>
            {selectedCity.city}
            <span className="heading-comma">, </span>
            <span className="state-name">{selectedCity.state}</span>
          </h1>
          <p className="location-subtitle">
            A simple snapshot of the weather and air around your city.
          </p>
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
              id="weather-tab"
              className="tab"
              type="button"
              role="tab"
              aria-selected={activeTab === 'weather'}
              aria-controls="weather-panel"
              tabIndex={activeTab === 'weather' ? 0 : -1}
              onClick={() => selectTab('weather')}
              onKeyDown={(event) => handleTabKeyDown(event, 0)}
            >
              <span className="tab-icon weather-tab-icon" aria-hidden="true">
                ☀
              </span>
              Weather
            </button>
            <button
              ref={(element) => {
                tabRefs.current[1] = element
              }}
              id="aqi-tab"
              className="tab"
              type="button"
              role="tab"
              aria-selected={activeTab === 'aqi'}
              aria-controls="aqi-panel"
              tabIndex={activeTab === 'aqi' ? 0 : -1}
              onClick={() => selectTab('aqi')}
              onKeyDown={(event) => handleTabKeyDown(event, 1)}
            >
              <span className="tab-icon aqi-tab-icon" aria-hidden="true">
                ◉
              </span>
              Air quality
            </button>
          </div>

          <div
            id="weather-panel"
            className="tab-panel"
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
                </div>

                <div className="weather-meta">
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
                  <a
                    className="weather-attribution"
                    href="https://open-meteo.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Weather data by Open-Meteo.com
                  </a>
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
                  </>
                ) : null}
              </div>
              <div className="aqi-gauge" aria-hidden="true">
                <span>US AQI</span>
                <span>model estimate</span>
              </div>
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
                <div className="detail-grid">
                  <article className="detail-card pollutant-card">
                    <span className="pollutant-tag">PM2.5</span>
                    <div>
                      <p className="detail-label">Fine particles · Model estimate</p>
                      <p className="detail-value">
                        {selectedAirQualityState.airQuality.pm25.toFixed(1)}
                        <span> µg/m³</span>
                      </p>
                    </div>
                  </article>
                  <article className="detail-card pollutant-card">
                    <span className="pollutant-tag">PM10</span>
                    <div>
                      <p className="detail-label">
                        Inhalable particles · Model estimate
                      </p>
                      <p className="detail-value">
                        {selectedAirQualityState.airQuality.pm10.toFixed(1)}
                        <span> µg/m³</span>
                      </p>
                    </div>
                  </article>
                </div>

                <div className="weather-meta">
                  <p className="observation-time">
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
        </section>

        <p className="data-footnote">
          Weather and air-quality conditions are model-based and may differ
          from local observations. Open-Meteo's US AQI is not CPCB India AQI or
          a reading from a local monitoring station.
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
