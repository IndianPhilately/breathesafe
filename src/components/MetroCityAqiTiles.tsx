import { useEffect, useRef, useState } from 'react'
import { getUsAqiCategory } from '../services/openMeteoAirQuality'
import { fetchMetroCityAirQuality } from '../services/openMeteoMetroCities'
import { METRO_CITY_IDS } from '../data/metroCities'
import type { CityDashboardData } from '../data/cities'

type TileAqiState =
  | { status: 'loading' }
  | { status: 'success'; usAqi: number; category: string }
  | { status: 'error' }

type MetroCityAqiTilesProps = {
  cities: CityDashboardData[]
  active: boolean
  onCitySelect: (city: CityDashboardData) => void
}

function aqiCategoryColor(category: string | null): string {
  switch (category) {
    case 'Good':
      return '#4a9b69'
    case 'Moderate':
      return '#c89d2a'
    case 'Unhealthy for Sensitive Groups':
      return '#d47c30'
    case 'Unhealthy':
      return '#c0453d'
    case 'Very Unhealthy':
      return '#8a3c8a'
    case 'Hazardous':
      return '#7a2020'
    default:
      return '#73847a'
  }
}

export function MetroCityAqiTiles({
  cities,
  active,
  onCitySelect,
}: MetroCityAqiTilesProps) {
  const metroCities = METRO_CITY_IDS.flatMap((id) => {
    const city = cities.find((c) => c.id === id)
    return city ? [city] : []
  })

  const [tileStates, setTileStates] = useState<
    Record<string, TileAqiState>
  >(() =>
    Object.fromEntries(metroCities.map((c) => [c.id, { status: 'loading' }])),
  )

  const abortRefs = useRef<Record<string, AbortController>>({})

  useEffect(() => {
    if (!active) return

    // Abort any previous in-flight requests
    for (const controller of Object.values(abortRefs.current)) {
      controller.abort()
    }
    abortRefs.current = {}

    // Reset to loading
    setTileStates(
      Object.fromEntries(metroCities.map((c) => [c.id, { status: 'loading' }])),
    )

    for (const city of metroCities) {
      const controller = new AbortController()
      abortRefs.current[city.id] = controller

      fetchMetroCityAirQuality(city.latitude, city.longitude, controller.signal)
        .then((aq) => {
          const category = getUsAqiCategory(aq.usAqi)
          setTileStates((prev) => ({
            ...prev,
            [city.id]: {
              status: 'success',
              usAqi: Math.round(aq.usAqi),
              category: category ?? 'Unknown',
            },
          }))
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setTileStates((prev) => ({
              ...prev,
              [city.id]: { status: 'error' },
            }))
          }
        })
    }

    return () => {
      for (const controller of Object.values(abortRefs.current)) {
        controller.abort()
      }
      abortRefs.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <section className="metro-aqi-section" aria-labelledby="metro-aqi-heading">
      <div className="metro-aqi-header">
        <p className="panel-kicker">Quick comparison</p>
        <h2 id="metro-aqi-heading">Major cities · Air Quality</h2>
        <p className="metro-aqi-intro">
          Live US AQI estimates for India's major cities. Click a city to view
          its full air quality details.
        </p>
      </div>

      <div className="metro-aqi-grid" role="list">
        {metroCities.map((city) => {
          const state = tileStates[city.id] ?? { status: 'loading' }
          const isSuccess = state.status === 'success'
          const color =
            isSuccess ? aqiCategoryColor(state.category) : undefined

          return (
            <button
              key={city.id}
              className="metro-aqi-tile"
              type="button"
              role="listitem"
              onClick={() => onCitySelect(city)}
              aria-label={
                isSuccess
                  ? `${city.city}: AQI ${state.usAqi}, ${state.category}. Click to view details.`
                  : state.status === 'loading'
                    ? `${city.city}: loading AQI`
                    : `${city.city}: AQI unavailable`
              }
            >
              <div className="metro-tile-header">
                <img
                  className="metro-tile-image"
                  src={`/cities/${city.id}.webp`}
                  alt=""
                  loading="lazy"
                  width="72"
                  height="54"
                />
                <div className="metro-tile-title">
                  <span className="metro-tile-city">{city.city}</span>
                  <span className="metro-tile-state">{city.state}</span>
                </div>
              </div>

              <div className="metro-tile-body">
                {state.status === 'loading' && (
                  <span className="metro-tile-aqi-loading" aria-hidden="true">
                    <span className="metro-tile-spinner" />
                  </span>
                )}

                {state.status === 'success' && (
                  <>
                    <span
                      className="metro-tile-aqi"
                      style={{ color }}
                      aria-hidden="true"
                    >
                      {state.usAqi}
                    </span>
                    <span
                      className="metro-tile-category"
                      style={{ color }}
                      aria-hidden="true"
                    >
                      {state.category}
                    </span>
                  </>
                )}

                {state.status === 'error' && (
                  <span className="metro-tile-error" aria-hidden="true">
                    —
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
