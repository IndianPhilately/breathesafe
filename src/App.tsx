import { useRef, useState, type KeyboardEvent } from 'react'
import {
  cityDashboardData,
  getAqiCategory,
  type CityDashboardData,
} from './data/cities'
import './App.css'

type DashboardTab = 'weather' | 'aqi'

function getInitialCity(): CityDashboardData {
  const city = cityDashboardData.find((item) => item.id === 'pune')
  if (!city) {
    throw new Error('The Pune demo city is missing from the city data.')
  }
  return city
}

const initialCity = getInitialCity()

function App() {
  const [selectedCity, setSelectedCity] =
    useState<CityDashboardData>(initialCity)
  const [activeTab, setActiveTab] = useState<DashboardTab>('weather')
  const tabRefs = useRef<[HTMLButtonElement | null, HTMLButtonElement | null]>([
    null,
    null,
  ])

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
    setActiveTab(nextIndex === 0 ? 'weather' : 'aqi')
    tabRefs.current[nextIndex]?.focus()
  }

  const aqiCategory = getAqiCategory(selectedCity.airQuality.aqi)

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
              if (city) setSelectedCity(city)
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

        <div className="demo-notice" role="note" aria-label="Demo data notice">
          <span className="demo-dot" aria-hidden="true" />
          <span>
            <strong>Demo data · Not live</strong>
            <span className="notice-detail">
              Illustrative sample values only — no live weather or AQI source is
              connected.
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
              onClick={() => setActiveTab('weather')}
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
              onClick={() => setActiveTab('aqi')}
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
                <p className="panel-kicker">Weather · Sample</p>
                <p
                  className="temperature"
                  aria-label={`${selectedCity.weather.temperatureC} degrees Celsius (demo)`}
                >
                  {selectedCity.weather.temperatureC}
                  <span>°C</span>
                </p>
                <p className="weather-condition">
                  {selectedCity.weather.condition}
                </p>
                <p className="city-caption">
                  {selectedCity.city}, {selectedCity.state}
                </p>
              </div>
              <div className="weather-illustration" aria-hidden="true">
                <span className="sun" />
                <span className="cloud cloud-back" />
                <span className="cloud cloud-front" />
              </div>
            </div>

            <div className="detail-grid">
              <article className="detail-card">
                <span className="detail-icon humidity-icon" aria-hidden="true">
                  ◌
                </span>
                <div>
                  <p className="detail-label">Humidity</p>
                  <p className="detail-value">
                    {selectedCity.weather.humidityPercent}
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
                    {selectedCity.weather.windKph}
                    <span> km/h</span>
                  </p>
                </div>
              </article>
            </div>
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
              data-aqi-category={aqiCategory.toLowerCase().replace(' ', '-')}
            >
              <div>
                <p className="panel-kicker">Air quality index · Sample</p>
                <p className="aqi-value">{selectedCity.airQuality.aqi}</p>
                <p className="aqi-category">{aqiCategory}</p>
                <p className="city-caption">
                  Illustrative India AQI scale value
                </p>
              </div>
              <div className="aqi-gauge" aria-hidden="true">
                <span>AQI</span>
                <span>sample level</span>
              </div>
            </div>

            <div className="detail-grid">
              <article className="detail-card pollutant-card">
                <span className="pollutant-tag">PM2.5</span>
                <div>
                  <p className="detail-label">Fine particles · Sample</p>
                  <p className="detail-value">
                    {selectedCity.airQuality.pm25}
                    <span> µg/m³</span>
                  </p>
                </div>
              </article>
              <article className="detail-card pollutant-card">
                <span className="pollutant-tag">PM10</span>
                <div>
                  <p className="detail-label">Inhalable particles · Sample</p>
                  <p className="detail-value">
                    {selectedCity.airQuality.pm10}
                    <span> µg/m³</span>
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <p className="data-footnote">
          These values are for demonstration only. They do not represent current
          conditions in {selectedCity.city}.
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
