import { useEffect, useRef, useState } from 'react'
import { getUsAqiCategory } from '../services/openMeteoAirQuality'
import {
  fetchAirQualityHistory,
  type AirQualityHistoryMetric,
  type AirQualityHistoryPoint,
} from '../services/openMeteoAirQualityHistory'

type AirQualityHistoryChartProps = {
  active: boolean
  cityId: string
  cityName: string
  latitude: number
  longitude: number
  refreshVersion: number
}

type ChartRange = '24-hours' | '7-days' | '30-days' | '3-months'
type ChartMode = 'bar' | 'line'
type ChartPoint = {
  time: string
  value: number
  severityAqi: number | null
}
type HistoryLoadState =
  | { status: 'loading' }
  | { status: 'success'; points: AirQualityHistoryPoint[] }
  | { status: 'error'; message: string }

const timeZone = 'Asia/Kolkata'
const hourInMilliseconds = 60 * 60 * 1000
const dayInMilliseconds = 24 * hourInMilliseconds

const rangeOptions: Array<{ value: ChartRange; label: string }> = [
  { value: '24-hours', label: '24 Hours' },
  { value: '7-days', label: '7 Days' },
  { value: '30-days', label: '30 Days' },
  { value: '3-months', label: '3 Months' },
]

const metricOptions: Array<{
  value: AirQualityHistoryMetric
  label: string
  unit: string
}> = [
  { value: 'usAqi', label: 'AQI (US)', unit: 'AQI' },
  { value: 'pm25', label: 'PM2.5', unit: 'µg/m³' },
  { value: 'pm10', label: 'PM10', unit: 'µg/m³' },
]

const severityColors = [
  { category: 'Good', range: '0–50', color: '#6fa77d' },
  { category: 'Moderate', range: '51–100', color: '#b9a94f' },
  {
    category: 'Unhealthy for Sensitive Groups',
    range: '101–150',
    color: '#d18b50',
  },
  { category: 'Unhealthy', range: '151–200', color: '#c66a62' },
  { category: 'Very Unhealthy', range: '201–300', color: '#9473a4' },
  { category: 'Hazardous', range: '301+', color: '#875b78' },
]

const chartWidth = 760
const chartHeight = 280
const plotLeft = 72
const plotRight = 744
const plotTop = 18
const plotBottom = 232
const plotWidth = plotRight - plotLeft
const plotHeight = plotBottom - plotTop

function getRangeDuration(range: ChartRange): number {
  switch (range) {
    case '24-hours':
      return 24 * hourInMilliseconds
    case '7-days':
      return 7 * dayInMilliseconds
    case '30-days':
      return 30 * dayInMilliseconds
    case '3-months':
      return 90 * dayInMilliseconds
  }
}

function getPointTime(time: string): number {
  return new Date(`${time}:00+05:30`).getTime()
}

function getSeverityAqi(
  point: AirQualityHistoryPoint,
  metric: AirQualityHistoryMetric,
): number | null {
  switch (metric) {
    case 'usAqi':
      return point.usAqi
    case 'pm25':
      return point.usAqiPm25
    case 'pm10':
      return point.usAqiPm10
  }
}

function getChartPoints(
  points: AirQualityHistoryPoint[],
  range: ChartRange,
  metric: AirQualityHistoryMetric,
  now: number,
): ChartPoint[] {
  const start = now - getRangeDuration(range)
  const selectedPoints = points.filter((point) => {
    const time = getPointTime(point.time)
    return time >= start && time <= now && point[metric] !== null
  })

  if (range === '24-hours') {
    return selectedPoints.flatMap((point) => {
      const value = point[metric]
      return value === null
        ? []
        : [
            {
              time: point.time,
              value,
              severityAqi: getSeverityAqi(point, metric),
            },
          ]
    })
  }

  const dailyPeaks = new Map<string, ChartPoint>()
  for (const point of selectedPoints) {
    const value = point[metric]
    if (value === null) continue

    const date = point.time.slice(0, 10)
    const peak = dailyPeaks.get(date)
    if (!peak || value > peak.value) {
      dailyPeaks.set(date, {
        time: point.time,
        value,
        severityAqi: getSeverityAqi(point, metric),
      })
    }
  }

  return [...dailyPeaks.values()].sort((left, right) =>
    left.time.localeCompare(right.time),
  )
}

function formatMetricValue(value: number, metric: AirQualityHistoryMetric): string {
  return metric === 'usAqi' ? String(Math.round(value)) : value.toFixed(1)
}

function formatAxisValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatPointTime(time: string, range: ChartRange): string {
  const date = new Date(getPointTime(time))
  const options: Intl.DateTimeFormatOptions =
    range === '24-hours'
      ? {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        }
      : { day: 'numeric', month: 'short', timeZone }
  return new Intl.DateTimeFormat('en-IN', options).format(date)
}

function formatAxisTime(time: string, range: ChartRange): string {
  const date = new Date(getPointTime(time))
  const options: Intl.DateTimeFormatOptions =
    range === '24-hours'
      ? { hour: '2-digit', minute: '2-digit', timeZone }
      : { day: 'numeric', month: 'short', timeZone }
  return new Intl.DateTimeFormat('en-IN', options).format(date)
}

function getPointCategory(
  point: ChartPoint,
  metric: AirQualityHistoryMetric,
): string | null {
  const aqi = metric === 'usAqi' ? point.value : point.severityAqi
  return aqi === null ? null : getUsAqiCategory(aqi)
}

function getPointColor(
  point: ChartPoint,
  metric: AirQualityHistoryMetric,
): string {
  const category = getPointCategory(point, metric)
  return (
    severityColors.find((item) => item.category === category)?.color ?? '#8b9890'
  )
}

function getPointTooltip(
  point: ChartPoint,
  range: ChartRange,
  metric: AirQualityHistoryMetric,
  unit: string,
): string {
  const category = getPointCategory(point, metric)
  return `${formatPointTime(point.time, range)}: ${formatMetricValue(point.value, metric)} ${unit} · ${category ? `${category} (US AQI)` : 'severity unavailable'}`
}

function getTickIndexes(length: number): number[] {
  const count = Math.min(5, length)
  if (count < 2) return length > 0 ? [0] : []

  return Array.from({ length: count }, (_, index) =>
    Math.round((index * (length - 1)) / (count - 1)),
  ).filter((index, position, indexes) => indexes.indexOf(index) === position)
}

export function AirQualityHistoryChart({
  active,
  cityId,
  cityName,
  latitude,
  longitude,
  refreshVersion,
}: AirQualityHistoryChartProps) {
  const [range, setRange] = useState<ChartRange>('24-hours')
  const [metric, setMetric] = useState<AirQualityHistoryMetric>('usAqi')
  const [chartMode, setChartMode] = useState<ChartMode>('bar')
  const [retryVersion, setRetryVersion] = useState(0)
  const [historyState, setHistoryState] =
    useState<HistoryLoadState>({ status: 'loading' })
  const [now] = useState(() => Date.now())
  const loadedRequestKey = useRef<string | null>(null)

  useEffect(() => {
    if (!active) return

    const requestKey = `${cityId}:${refreshVersion}:${retryVersion}`
    if (loadedRequestKey.current === requestKey) return

    const controller = new AbortController()
    let activeRequest = true
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 15_000)

    setHistoryState({ status: 'loading' })

    void Promise.resolve()
      .then(() => {
        if (!activeRequest) return null
        return fetchAirQualityHistory(latitude, longitude, controller.signal)
      })
      .then((points) => {
        if (!points || !activeRequest) return
        loadedRequestKey.current = requestKey
        setHistoryState({ status: 'success', points })
      })
      .catch((error: unknown) => {
        if (!activeRequest) return
        setHistoryState({
          status: 'error',
          message: timedOut
            ? 'The air-quality history request timed out. Please try again.'
            : error instanceof Error
              ? error.message
              : 'Unable to load air-quality history. Please try again.',
        })
      })
      .finally(() => window.clearTimeout(timeoutId))

    return () => {
      activeRequest = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [active, cityId, latitude, longitude, refreshVersion, retryVersion])

  const availableMetrics =
    historyState.status === 'success'
      ? metricOptions.filter(({ value }) =>
          historyState.points.some((point) => point[value] !== null),
        )
      : []
  const selectedMetric = availableMetrics.some((option) => option.value === metric)
    ? metric
    : availableMetrics[0]?.value ?? metric
  const chartPoints =
    historyState.status === 'success'
      ? getChartPoints(historyState.points, range, selectedMetric, now)
      : []
  const metricLabel =
    metricOptions.find((option) => option.value === selectedMetric)?.label ??
    'AQI (US)'
  const metricUnit =
    metricOptions.find((option) => option.value === selectedMetric)?.unit ?? 'AQI'
  const isDailyPeakRange = range !== '24-hours'
  const maximumValue = chartPoints.reduce(
    (maximum, point) => Math.max(maximum, point.value),
    0,
  )
  const axisMaximum = Math.max(1, Math.ceil(maximumValue / 4) * 4)
  const barWidth = Math.min(
    34,
    (plotWidth / Math.max(chartPoints.length, 1)) * 0.68,
  )
  const xForIndex = (index: number) =>
    chartPoints.length === 1
      ? plotLeft + plotWidth / 2
      : plotLeft + (index * plotWidth) / (chartPoints.length - 1)
  const yForValue = (value: number) =>
    plotBottom - (value / axisMaximum) * plotHeight
  const linePath = chartPoints
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForValue(point.value)}`,
    )
    .join(' ')
  const tickIndexes = getTickIndexes(chartPoints.length)
  const minimumPoint = chartPoints.reduce<ChartPoint | null>(
    (minimum, point) => (!minimum || point.value < minimum.value ? point : minimum),
    null,
  )
  const maximumPoint = chartPoints.reduce<ChartPoint | null>(
    (maximum, point) => (!maximum || point.value > maximum.value ? point : maximum),
    null,
  )

  function handleMetricChange(value: string) {
    const nextMetric = availableMetrics.find((option) => option.value === value)
    if (nextMetric) setMetric(nextMetric.value)
  }

  return (
    <section className="aqi-history" aria-labelledby="aqi-history-heading">
      <div className="aqi-history-header">
        <div>
          <p className="panel-kicker">Historical air quality</p>
          <h2 id="aqi-history-heading">Air quality trend</h2>
          <p className="aqi-history-intro">
            Modeled estimates for {cityName}; not local monitoring-station readings.
          </p>
        </div>
        <div className="aqi-history-controls">
          <label className="aqi-history-control" htmlFor="aqi-history-range">
            <span>Time range</span>
            <select
              id="aqi-history-range"
              value={range}
              onChange={(event) => {
                const nextRange = rangeOptions.find(
                  (option) => option.value === event.currentTarget.value,
                )
                if (nextRange) setRange(nextRange.value)
              }}
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value="1-year" disabled>
                1 Year (unavailable)
              </option>
              <option value="10-years" disabled>
                10 Years (unavailable)
              </option>
            </select>
          </label>
          <label className="aqi-history-control" htmlFor="aqi-history-metric">
            <span>Measure</span>
            <select
              id="aqi-history-metric"
              value={selectedMetric}
              onChange={(event) => handleMetricChange(event.currentTarget.value)}
              disabled={
                historyState.status !== 'success' || availableMetrics.length < 2
              }
            >
              {(availableMetrics.length > 0 ? availableMetrics : metricOptions).map(
                (option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>
          <div className="aqi-chart-mode" role="group" aria-label="Chart type">
            <button
              className={chartMode === 'bar' ? 'is-selected' : ''}
              type="button"
              aria-pressed={chartMode === 'bar'}
              onClick={() => setChartMode('bar')}
            >
              Bar chart
            </button>
            <button
              className={chartMode === 'line' ? 'is-selected' : ''}
              type="button"
              aria-pressed={chartMode === 'line'}
              onClick={() => setChartMode('line')}
            >
              Line chart
            </button>
          </div>
        </div>
      </div>

      <p className="aqi-history-availability">
        This India data source provides up to 92 past days, so 1 Year and 10 Years
        are unavailable.
      </p>

      {historyState.status === 'loading' ? (
        <div className="aqi-history-state" role="status" aria-live="polite">
          <span className="loading-spinner" aria-hidden="true" />
          Loading modeled air-quality history for {cityName}…
        </div>
      ) : null}

      {historyState.status === 'error' ? (
        <div className="aqi-history-error" role="alert">
          <p>{historyState.message}</p>
          <button
            className="retry-button"
            type="button"
            onClick={() => setRetryVersion((version) => version + 1)}
          >
            Retry history
          </button>
        </div>
      ) : null}

      {historyState.status === 'success' && chartPoints.length === 0 ? (
        <div className="aqi-history-state" role="status">
          No {metricLabel} data is available for this range.
        </div>
      ) : null}

      {historyState.status === 'success' && chartPoints.length > 0 ? (
        <>
          <p className="aqi-history-period">
            {isDailyPeakRange
              ? 'Daily peaks · maximum modeled value for each local day'
              : 'Actual 3-hour model samples · last 24 hours'}
          </p>
          <div className="aqi-history-summary" aria-label={`${metricLabel} summary`}>
            {minimumPoint ? (
              <div className="aqi-history-summary-card">
                <span>Minimum</span>
                <strong>
                  {formatMetricValue(minimumPoint.value, selectedMetric)}{' '}
                  <small>{metricUnit}</small>
                </strong>
                <time dateTime={`${minimumPoint.time}:00+05:30`}>
                  {formatPointTime(minimumPoint.time, range)}
                </time>
              </div>
            ) : null}
            {maximumPoint ? (
              <div className="aqi-history-summary-card">
                <span>Maximum</span>
                <strong>
                  {formatMetricValue(maximumPoint.value, selectedMetric)}{' '}
                  <small>{metricUnit}</small>
                </strong>
                <time dateTime={`${maximumPoint.time}:00+05:30`}>
                  {formatPointTime(maximumPoint.time, range)}
                </time>
              </div>
            ) : null}
          </div>

          <div className="aqi-history-chart-wrap">
            <svg
              className="aqi-history-chart"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label={`${chartMode === 'bar' ? 'Bar' : 'Line'} chart of ${metricLabel} for ${cityName}, ${rangeOptions.find((option) => option.value === range)?.label}.`}
            >
              <g aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => {
                  const y = plotBottom - (index * plotHeight) / 4
                  const value = (index * axisMaximum) / 4
                  return (
                    <g key={index}>
                      <line
                        x1={plotLeft}
                        x2={plotRight}
                        y1={y}
                        y2={y}
                        className="aqi-chart-gridline"
                      />
                      <text
                        x={plotLeft - 24}
                        y={y + 4}
                        className="aqi-chart-axis-label"
                        textAnchor="end"
                      >
                        {formatAxisValue(value)}
                      </text>
                    </g>
                  )
                })}
              </g>

              {chartMode === 'bar'
                ? chartPoints.map((point, index) => {
                    const y = yForValue(point.value)
                    return (
                      <rect
                        key={point.time}
                        x={xForIndex(index) - barWidth / 2}
                        y={y}
                        width={barWidth}
                        height={plotBottom - y}
                        rx="3"
                        fill={getPointColor(point, selectedMetric)}
                      >
                        <title>{getPointTooltip(point, range, selectedMetric, metricUnit)}</title>
                      </rect>
                    )
                  })
                : (
                    <>
                      <path d={linePath} className="aqi-chart-line" />
                      {chartPoints.map((point, index) => (
                        <circle
                          key={point.time}
                          cx={xForIndex(index)}
                          cy={yForValue(point.value)}
                          r="4"
                          fill={getPointColor(point, selectedMetric)}
                        >
                          <title>{getPointTooltip(point, range, selectedMetric, metricUnit)}</title>
                        </circle>
                      ))}
                    </>
                  )}

              <g aria-hidden="true">
                {tickIndexes.map((index) => {
                  const anchor =
                    index === 0
                      ? 'start'
                      : index === chartPoints.length - 1
                        ? 'end'
                        : 'middle'
                  return (
                    <text
                      key={chartPoints[index].time}
                      x={xForIndex(index)}
                      y={plotBottom + 25}
                      className="aqi-chart-axis-label"
                      textAnchor={anchor}
                    >
                      {formatAxisTime(chartPoints[index].time, range)}
                    </text>
                  )
                })}
              </g>
            </svg>
          </div>

          <div className="aqi-chart-legend">
            <div>
              <p className="aqi-chart-legend-title">
                Color key · U.S. AQI categories and ranges
              </p>
              <p className="aqi-chart-legend-note">
                Ranges are U.S. AQI values. PM bars use their pollutant-specific AQI index.
              </p>
            </div>
            <ul aria-label="U.S. AQI severity colors and ranges">
              {severityColors.map(({ category, range: categoryRange, color }) => (
                <li key={category}>
                  <span
                    className="aqi-chart-legend-swatch"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  {category} <span className="aqi-chart-legend-range">{categoryRange}</span>
                </li>
              ))}
              <li>
                <span
                  className="aqi-chart-legend-swatch"
                  style={{ backgroundColor: '#8b9890' }}
                  aria-hidden="true"
                />
                Unavailable
              </li>
            </ul>
          </div>

          <table className="aqi-history-screen-reader-table">
            <caption>
              {metricLabel} {isDailyPeakRange ? 'daily peaks' : '3-hour samples'} for{' '}
              {cityName}
            </caption>
            <thead>
              <tr>
                <th scope="col">Time (IST)</th>
                <th scope="col">{metricLabel}</th>
                <th scope="col">U.S. AQI category</th>
              </tr>
            </thead>
            <tbody>
              {chartPoints.map((point) => (
                <tr key={point.time}>
                  <th scope="row">{formatPointTime(point.time, range)}</th>
                  <td>
                    {formatMetricValue(point.value, selectedMetric)} {metricUnit}
                  </td>
                  <td>{getPointCategory(point, selectedMetric) ?? 'Unavailable'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <p className="aqi-history-source">
        Source: Open-Meteo CAMS Global · 3-hourly modeled estimates · times shown in
        IST.
      </p>
    </section>
  )
}
