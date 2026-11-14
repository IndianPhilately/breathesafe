import { expect, test, type Page, type Route } from '@playwright/test'
import {
  CITY_POPULATION_LICENSE,
  CITY_POPULATION_MINIMUM,
  CITY_POPULATION_SOURCE,
  cityDashboardData,
} from '../src/data/cities'

const weatherApiPattern = 'https://api.open-meteo.com/v1/forecast**'
const airQualityApiPattern =
  'https://air-quality-api.open-meteo.com/v1/air-quality**'
const archiveApiPattern = 'https://archive-api.open-meteo.com/v1/archive**'

function currentWeather(overrides: Record<string, unknown> = {}) {
  return {
    current: {
      time: '2026-11-14T02:00',
      temperature_2m: 26.4,
      relative_humidity_2m: 68,
      weather_code: 2,
      wind_speed_10m: 12.6,
      wind_direction_10m: 90,
      apparent_temperature: 24.1,
      ...overrides,
    },
    hourly: {
      time: ['2026-11-14T02:00'],
      precipitation_probability: [9],
    },
    daily: {
      time: ['2026-11-14'],
      temperature_2m_max: [30],
      temperature_2m_min: [17],
    },
  }
}

function currentAirQuality(overrides: Record<string, unknown> = {}) {
  return {
    current: {
      time: '2026-11-14T01:30',
      us_aqi: 115,
      pm2_5: 40.4,
      pm10: 46.1,
      carbon_monoxide: 667,
      nitrogen_dioxide: 17.4,
      sulphur_dioxide: 15.3,
      ozone: 89,
      ...overrides,
    },
  }
}

function historicalAirQuality(asOf = new Date()) {
  const interval = 3 * 60 * 60 * 1000
  const indiaOffset = 5.5 * 60 * 60 * 1000
  const latestSample = Math.floor(asOf.getTime() / interval) * interval
  const sampleCount = 92 * 8 + 1
  const time = Array.from({ length: sampleCount }, (_, index) =>
    new Date(
      latestSample - (sampleCount - 1 - index) * interval + indiaOffset,
    )
      .toISOString()
      .slice(0, 16),
  )
  const localHours = time.map((value) => Number(value.slice(11, 13)))

  return {
    hourly: {
      time,
      us_aqi: localHours.map((hour) => 20 + hour),
      us_aqi_pm2_5: localHours.map((hour) => (hour >= 18 ? 175 : 80)),
      us_aqi_pm10: localHours.map((hour) => (hour >= 18 ? 125 : 55)),
      pm2_5: localHours.map((hour) => Number((5 + hour / 10).toFixed(1))),
      pm10: localHours.map((hour) => 10 + hour),
    },
  }
}

function addIsoDays(date: string, offset: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + offset)
  return value.toISOString().slice(0, 10)
}

async function fulfillDailyWeatherRange(route: Route) {
  const url = new URL(route.request().url())
  const start = new Date(`${url.searchParams.get('start_date')}T00:00:00Z`)
  const end = new Date(`${url.searchParams.get('end_date')}T00:00:00Z`)
  const dates: string[] = []
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(date.toISOString().slice(0, 10))
  }

  await route.fulfill({
    json: {
      daily: {
        time: dates,
        temperature_2m_max: dates.map(() => 29),
        temperature_2m_min: dates.map(() => 18),
        weather_code: dates.map(() => 1),
      },
    },
  })
}

async function mockWeather(page: Page, response?: (route: Route) => Promise<void>) {
  await page.route(weatherApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('forecast_days') === '16') {
      await fulfillDailyWeatherRange(route)
      return
    }

    if (response) {
      await response(route)
      return
    }

    await route.fulfill({ json: currentWeather() })
  })
}

async function mockAirQuality(
  page: Page,
  response?: (route: Route) => Promise<void>,
  historyResponse?: (route: Route) => Promise<void>,
) {
  await page.route(airQualityApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.has('hourly')) {
      if (historyResponse) {
        await historyResponse(route)
        return
      }

      await route.fulfill({ json: historicalAirQuality() })
      return
    }

    if (response) {
      await response(route)
      return
    }

    await route.fulfill({ json: currentAirQuality() })
  })
}

test.beforeEach(async ({ page }) => {
  await page.route(archiveApiPattern, async (route) => {
    await fulfillDailyWeatherRange(route)
  })
  await mockAirQuality(page)
})

async function selectCityBySearch(page: Page, cityName: string) {
  const search = page.getByRole('combobox', { name: 'Search cities' })
  await search.fill(cityName)
  await page.getByRole('option', { name: new RegExp(cityName) }).first().click()
}

test('aligns the larger header brand and city picker with dashboard content', async ({
  page,
}) => {
  await mockWeather(page)
  await mockAirQuality(page)
  await page.goto('/')

  await expect(page.locator('.brand-mark')).toHaveCSS('width', '48px')
  await expect(page.locator('.brand')).toHaveCSS('font-size', '21px')

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport)
    const alignment = await page.evaluate(() => {
      const main = document.querySelector('.main-content')!.getBoundingClientRect()
      const brand = document.querySelector('.brand')!.getBoundingClientRect()
      const picker = document.querySelector('.city-picker')!.getBoundingClientRect()
      return {
        brandLeft: Math.abs(brand.left - main.left),
        pickerRight: Math.abs(picker.right - main.right),
      }
    })

    expect(alignment.brandLeft).toBeLessThan(1)
    expect(alignment.pickerRight).toBeLessThan(1)
  }
})

test('city fixtures use the linked 2011 population threshold with valid coordinates', () => {
  expect(cityDashboardData).toHaveLength(339)
  expect(
    cityDashboardData.every(
      (city) =>
        city.population >= CITY_POPULATION_MINIMUM &&
        Number.isFinite(city.latitude) &&
        Number.isFinite(city.longitude) &&
        city.latitude >= -90 &&
        city.latitude <= 90 &&
        city.longitude >= -180 &&
        city.longitude <= 180,
    ),
  ).toBe(true)
  expect(new Set(cityDashboardData.map((city) => city.id)).size).toBe(339)
  expect(cityDashboardData.find((city) => city.id === 'pune')).toMatchObject({
    city: 'Pune',
    population: 3_124_458,
  })
})

test('opens the Air quality tab by default and loads selected-city data', async ({
  page,
}) => {
  const requestedLocations: Array<{ latitude: string | null; longitude: string | null }> =
    []
  const requestedWeatherQueries: Array<Record<string, string | null>> = []
  const requestedAirQualityRequests: Array<{
    latitude: string | null
    longitude: string | null
    current: string | null
    timezone: string | null
  }> = []
  const requestedHistoryRequests: Array<{
    latitude: string | null
    longitude: string | null
    hourly: string | null
    past_days: string | null
    forecast_days: string | null
    timezone: string | null
  }> = []
  await mockWeather(page, async (route) => {
    const url = new URL(route.request().url())
    requestedLocations.push({
      latitude: url.searchParams.get('latitude'),
      longitude: url.searchParams.get('longitude'),
    })
    requestedWeatherQueries.push({
      current: url.searchParams.get('current'),
      hourly: url.searchParams.get('hourly'),
      daily: url.searchParams.get('daily'),
      forecast_days: url.searchParams.get('forecast_days'),
      timezone: url.searchParams.get('timezone'),
    })
    await route.fulfill({ json: currentWeather() })
  })
  await mockAirQuality(
    page,
    async (route) => {
      const url = new URL(route.request().url())
      requestedAirQualityRequests.push({
        latitude: url.searchParams.get('latitude'),
        longitude: url.searchParams.get('longitude'),
        current: url.searchParams.get('current'),
        timezone: url.searchParams.get('timezone'),
      })
      await route.fulfill({ json: currentAirQuality() })
    },
    async (route) => {
      const url = new URL(route.request().url())
      requestedHistoryRequests.push({
        latitude: url.searchParams.get('latitude'),
        longitude: url.searchParams.get('longitude'),
        hourly: url.searchParams.get('hourly'),
        past_days: url.searchParams.get('past_days'),
        forecast_days: url.searchParams.get('forecast_days'),
        timezone: url.searchParams.get('timezone'),
      })
      await route.fulfill({
        json: historicalAirQuality(new Date('2026-11-14T03:30:00+05:30')),
      })
    },
  )

  await page.goto('/')

  const airQualityTab = page.getByRole('tab', { name: 'Air quality' })
  await expect(page.getByRole('tab').nth(0)).toHaveAccessibleName('Air quality')
  await expect(page.getByRole('tab').nth(1)).toHaveAccessibleName('Weather')
  await expect(airQualityTab).toHaveAttribute('aria-selected', 'true')
  await expect(
    page
      .locator('.aqi-overview')
      .getByText(/Model time 14 Nov 2026, 1:30 am IST/),
  ).toBeVisible()
  await expect(
    page.locator('#aqi-panel .weather-meta').getByText(/Model time/),
  ).toHaveCount(0)
  await expect(page.getByText('115', { exact: true })).toBeVisible()
  await expect.poll(() => requestedAirQualityRequests.length).toBe(1)
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
  await expect(
    page.locator('.aqi-category').getByText('Unhealthy for Sensitive Groups'),
  ).toBeVisible()
  await expect(page.getByText('40.4 µg/m³')).toBeVisible()
  await expect(page.getByText('46.1 µg/m³')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Major air pollutants' }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Major air pollutants' }).getByText(
      'Model estimate',
    ),
  ).toHaveCount(0)
  await expect(page.getByText('667.0 µg/m³')).toBeVisible()
  await expect(page.getByText('17.4 µg/m³')).toBeVisible()
  await expect(page.getByText('15.3 µg/m³')).toBeVisible()
  await expect(page.getByText('89.0 µg/m³')).toBeVisible()
  await expect(page.getByText(/Model time 14 Nov 2026, 1:30 am IST/)).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Air quality trend' }),
  ).toBeVisible()
  await expect.poll(() => requestedHistoryRequests.length).toBe(1)
  await expect(
    page.getByRole('link', { name: 'Air quality data by Open-Meteo' }),
  ).toHaveAttribute('href', 'https://open-meteo.com/')
  await expect(
    page.getByRole('link', { name: 'CC BY 4.0 licence' }),
  ).toHaveAttribute('href', 'https://open-meteo.com/en/licence')

  await page.getByRole('tab', { name: 'Weather' }).click()
  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
  expect(requestedHistoryRequests).toHaveLength(1)
  await expect(page.getByText('Partly cloudy')).toBeVisible()
  await expect(page.getByText('68%', { exact: true })).toBeVisible()
  await expect(page.getByText('13 km/h', { exact: false })).toBeVisible()
  await expect(page.getByText(/High: 30°C.*Low: 17°C/)).toBeVisible()
  await expect(
    page.getByRole('article').filter({ hasText: 'Feels like' }),
  ).toContainText('24°C')
  await expect(
    page.getByRole('article').filter({ hasText: 'Chance of rain' }),
  ).toContainText('9%')
  await expect(
    page.getByRole('article').filter({ hasText: 'Wind' }),
  ).toContainText('13 km/h')
  await expect(page.getByText(/Model time 14 Nov 2026, 2:00 am IST/)).toBeVisible()
  expect(
    requestedWeatherQueries.find((query) => query.forecast_days === '1'),
  ).toEqual({
    current:
      'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature',
    hourly: 'precipitation_probability',
    daily: 'temperature_2m_max,temperature_2m_min',
    forecast_days: '1',
    timezone: 'Asia/Kolkata',
  })

  await expect(
    page.locator('.weather-footer').getByRole('link', {
      name: 'Weather data by Open-Meteo.com',
    }),
  ).toHaveAttribute('href', 'https://open-meteo.com/')
  await expect(
    page.locator('.weather-footer').getByRole('button', {
      name: 'Refresh weather for Delhi',
    }),
  ).toBeVisible()
  await expect(
    page.getByText('Air quality · Model-based estimates'),
  ).toBeVisible()

  await selectCityBySearch(page, 'Pune')
  await page.getByRole('tab', { name: 'Air quality' }).click()
  await expect.poll(() => requestedAirQualityRequests.length).toBe(2)
  await expect.poll(() => requestedHistoryRequests.length).toBe(2)
  await expect(page.getByText('115', { exact: true })).toBeVisible()
  expect(requestedAirQualityRequests).toEqual([
    {
      latitude: '28.7041',
      longitude: '77.1025',
      current:
        'us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
      timezone: 'Asia/Kolkata',
    },
    {
      latitude: '18.5204',
      longitude: '73.8567',
      current:
        'us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
      timezone: 'Asia/Kolkata',
    },
  ])
  expect(requestedHistoryRequests).toEqual([
    {
      latitude: '28.7041',
      longitude: '77.1025',
      hourly: 'us_aqi,us_aqi_pm2_5,us_aqi_pm10,pm2_5,pm10',
      past_days: '92',
      forecast_days: '0',
      timezone: 'Asia/Kolkata',
    },
    {
      latitude: '18.5204',
      longitude: '73.8567',
      hourly: 'us_aqi,us_aqi_pm2_5,us_aqi_pm10,pm2_5,pm10',
      past_days: '92',
      forecast_days: '0',
      timezone: 'Asia/Kolkata',
    },
  ])
  expect(
    new Set(requestedLocations.map(({ latitude, longitude }) => `${latitude},${longitude}`)),
  ).toEqual(new Set(['18.5204,73.8567', '28.7041,77.1025']))
})

test('charts history across ranges, pollutant measures, and chart styles', async ({
  page,
}) => {
  const asOf = new Date('2026-11-14T03:30:00+05:30')
  await page.clock.install({ time: asOf })
  await page.setViewportSize({ width: 375, height: 812 })
  await mockWeather(page)
  await mockAirQuality(page, undefined, async (route) => {
    await route.fulfill({ json: historicalAirQuality(asOf) })
  })

  await page.goto('/')

  const range = page.getByLabel('Time range')
  const measure = page.getByLabel('Measure')
  const chartData = page.locator('.aqi-history-screen-reader-table tbody tr')
  await expect(range).toHaveCSS('font-size', '14px')
  await expect(range).toHaveCSS('font-weight', '600')
  await expect(range).toHaveCSS('min-height', '44px')
  const controlFont = await range.evaluate(
    (element) => getComputedStyle(element).fontFamily,
  )
  const bodyFont = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).fontFamily)
  expect(controlFont).toBe(bodyFont)
  await expect(page.getByRole('heading', { name: 'Air quality trend' })).toBeVisible()
  await expect(
    page.getByRole('img', {
      name: 'Bar chart of AQI (US) for Delhi, 24 Hours.',
    }),
  ).toBeVisible()
  await expect(range).toHaveValue('24-hours')
  await expect(measure).toHaveValue('usAqi')
  const yAxisOverlapsFirstBar = await page
    .locator('.aqi-history-chart')
    .evaluate((svg) => {
      const labels = Array.from(
        svg.querySelectorAll<SVGTextElement>(
          '.aqi-chart-axis-label[text-anchor="end"]',
        ),
      )
      const firstBar = svg.querySelector('rect')?.getBoundingClientRect()
      return (
        firstBar !== undefined &&
        labels.some((label) => {
          const bounds = label.getBoundingClientRect()
          return (
            bounds.left < firstBar.right &&
            bounds.right > firstBar.left &&
            bounds.top < firstBar.bottom &&
            bounds.bottom > firstBar.top
          )
        })
      )
    })
  expect(yAxisOverlapsFirstBar).toBe(false)

  const recentSampleCount = await chartData.count()
  expect(recentSampleCount).toBe(8)
  await expect(
    page.getByText('Actual 3-hour model samples · last 24 hours'),
  ).toBeVisible()

  await measure.selectOption('pm25')
  const pm25BarColors = await page
    .locator('.aqi-history-chart rect')
    .evaluateAll((bars) => bars.map((bar) => bar.getAttribute('fill')))
  expect(pm25BarColors).toContain('#b9a94f')
  expect(pm25BarColors).toContain('#c66a62')
  await measure.selectOption('usAqi')

  await range.selectOption('7-days')
  await expect(
    page.getByText('Daily peaks · maximum modeled value for each local day'),
  ).toBeVisible()
  const sevenDayRows = await chartData.count()
  expect(sevenDayRows).toBeGreaterThanOrEqual(7)
  expect(sevenDayRows).toBeLessThanOrEqual(8)
  await expect(chartData.getByText('43 AQI', { exact: true }).first()).toBeVisible()

  await measure.selectOption('pm25')
  await expect(measure).toHaveValue('pm25')
  await expect(
    page
      .locator('.aqi-history-screen-reader-table')
      .getByText('7.3 µg/m³', { exact: true })
      .first(),
  ).toBeVisible()
  await expect(page.locator('.aqi-history-chart rect').first()).toHaveAttribute(
    'fill',
    '#c66a62',
  )
  await measure.selectOption('pm10')
  await expect(page.locator('.aqi-history-chart rect').first()).toHaveAttribute(
    'fill',
    '#d18b50',
  )
  const severityLegend = page.getByRole('list', {
    name: 'U.S. AQI severity colors and ranges',
  })
  await expect(severityLegend).toContainText('Good 0–50')
  await expect(severityLegend).toContainText('Moderate 51–100')
  await expect(severityLegend).toContainText('Unhealthy for Sensitive Groups 101–150')
  await expect(severityLegend).toContainText('Unhealthy 151–200')
  await expect(severityLegend).toContainText('Very Unhealthy 201–300')
  await expect(severityLegend).toContainText('Hazardous 301+')

  await page.getByRole('button', { name: 'Line chart' }).click()
  await expect(
    page.getByRole('img', { name: 'Line chart of PM10 for Delhi, 7 Days.' }),
  ).toBeVisible()

  await range.selectOption('3-months')
  const threeMonthRows = await chartData.count()
  expect(threeMonthRows).toBeGreaterThan(85)
  expect(threeMonthRows).toBeLessThan(95)
  await expect(page.locator('option[value="1-year"]')).toBeDisabled()
  await expect(page.locator('option[value="10-years"]')).toBeDisabled()
  await expect(
    page.getByText(/up to 92 past days, so 1 Year and 10 Years are unavailable/),
  ).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})

test('retries failed history without hiding current air quality', async ({
  page,
}) => {
  let historyRequestCount = 0
  await mockWeather(page)
  await mockAirQuality(page, undefined, async (route) => {
    historyRequestCount += 1
    if (historyRequestCount === 1) {
      await route.fulfill({ status: 503, body: 'Unavailable' })
      return
    }

    await route.fulfill({ json: historicalAirQuality() })
  })

  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('HTTP 503')
  await expect(page.getByText('115', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Retry history' }).click()
  await expect(
    page.getByRole('img', { name: /Bar chart of AQI \(US\) for Delhi/ }),
  ).toBeVisible()
  expect(historyRequestCount).toBe(2)
})

test('shows an empty history state when all requested values are missing', async ({
  page,
}) => {
  await page.clock.install({
    time: new Date('2026-11-14T03:30:00+05:30'),
  })
  await mockWeather(page)
  await mockAirQuality(page, undefined, async (route) => {
    await route.fulfill({
      json: {
        hourly: {
          time: ['2026-11-14T03:00'],
          us_aqi: [null],
          pm2_5: [null],
          pm10: [null],
        },
      },
    })
  })

  await page.goto('/')
  await expect(page.getByRole('status')).toContainText(
    'No AQI (US) data is available for this range.',
  )
})

test('uses a neutral chart color when pollutant severity data is unavailable', async ({
  page,
}) => {
  await page.clock.install({
    time: new Date('2026-11-14T03:30:00+05:30'),
  })
  await mockWeather(page)
  await mockAirQuality(page, undefined, async (route) => {
    await route.fulfill({
      json: {
        hourly: {
          time: ['2026-11-14T03:00'],
          us_aqi: [115],
          pm2_5: [80],
          pm10: [90],
        },
      },
    })
  })

  await page.goto('/')
  await page.getByLabel('Measure').selectOption('pm25')
  await expect(page.locator('.aqi-history-chart rect')).toHaveAttribute(
    'fill',
    '#8b9890',
  )
  await expect(
    page.locator('.aqi-history-screen-reader-table tbody'),
  ).toContainText('Unavailable')
})

test('shows an illustration for each US AQI category', async ({ page }) => {
  let usAqi = 25
  await mockWeather(page)
  await mockAirQuality(page, async (route) => {
    await route.fulfill({ json: currentAirQuality({ us_aqi: usAqi }) })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Air quality' }).click()

  const categories = [
    {
      value: 25,
      slug: 'good',
      label: 'Good',
      guidance:
        'Air quality is satisfactory, and air pollution poses little or no risk.',
    },
    {
      value: 75,
      slug: 'moderate',
      label: 'Moderate',
      guidance:
        'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.',
    },
    {
      value: 125,
      slug: 'unhealthy-for-sensitive-groups',
      label: 'Unhealthy for Sensitive Groups',
      guidance:
        'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
    },
    {
      value: 175,
      slug: 'unhealthy',
      label: 'Unhealthy',
      guidance:
        'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
    },
    {
      value: 250,
      slug: 'very-unhealthy',
      label: 'Very Unhealthy',
      guidance: 'Health alert: the risk of health effects is increased for everyone.',
    },
    {
      value: 350,
      slug: 'hazardous',
      label: 'Hazardous',
      guidance:
        'Health warning of emergency conditions: everyone is more likely to be affected.',
    },
  ]

  for (const [index, category] of categories.entries()) {
    if (index > 0) {
      usAqi = category.value
      await page.getByRole('button', { name: 'Refresh air quality for Delhi' }).click()
    }

    await expect(page.locator('.aqi-overview')).toHaveAttribute(
      'data-aqi-category',
      category.slug,
    )
    await expect(page.locator('.aqi-category')).toHaveText(category.label)
    await expect(page.locator('.aqi-guidance p')).toHaveText(category.guidance)

    const illustration = page.locator('.aqi-illustration')
    await expect(illustration).toHaveAttribute(
      'src',
      `/aqi-${category.slug}.webp`,
    )
    await expect
      .poll(() =>
        illustration.evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0)
  }

  const illustration = page.locator('.aqi-illustration')
  await expect(illustration).toHaveCSS('object-fit', 'contain')
  const desktopImageHeight = await illustration.evaluate(
    (image) => image.getBoundingClientRect().height,
  )
  expect(desktopImageHeight).toBeGreaterThanOrEqual(170)

  await page.setViewportSize({ width: 375, height: 812 })
  await expect(illustration).toHaveCSS('object-fit', 'cover')

  const guidance = page.locator('.aqi-guidance')
  await expect(guidance.locator('summary')).toHaveText(
    'What does this AQI category mean?',
  )
  await expect(guidance).not.toHaveAttribute('open', '')
  await guidance.locator('summary').click()
  await expect(guidance.getByRole('link', { name: 'AirNow: AQI Basics' })).toHaveAttribute(
    'href',
    'https://www.airnow.gov/aqi/aqi-basics/',
  )
  await expect(guidance.locator('p')).toBeVisible()
})

test('matches rain probability to the current hourly forecast interval', async ({
  page,
}) => {
  await page.route(weatherApiPattern, async (route) => {
    const response = currentWeather({ time: '2026-11-14T02:15' })
    await route.fulfill({ json: response })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Weather' }).click()
  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
  await expect(
    page.getByRole('article').filter({ hasText: 'Chance of rain' }),
  ).toContainText('9%')
})

test('shows the monthly calendar in the weather tab with historical, forecast, and typical data', async ({
  page,
}) => {
  await page.clock.install({
    time: new Date('2026-11-14T03:30:00+05:30'),
  })

  const forecastDates = Array.from({ length: 16 }, (_, index) =>
    addIsoDays('2026-11-14', index),
  )
  await page.route(weatherApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('forecast_days') === '16') {
      await route.fulfill({
        json: {
          daily: {
            time: forecastDates,
            temperature_2m_max: forecastDates.map((_, index) =>
              index === 15 ? null : 31,
            ),
            temperature_2m_min: forecastDates.map((_, index) =>
              index === 15 ? null : 20,
            ),
            weather_code: forecastDates.map((_, index) =>
              index === 15 ? null : 2,
            ),
          },
        },
      })
      return
    }

    await route.fulfill({ json: currentWeather() })
  })

  const typicalDates = Array.from({ length: 10 }, (_, index) => [
    `${2016 + index}-11-29`,
    `${2016 + index}-11-30`,
  ]).flat()
  await page.route(archiveApiPattern, async (route) => {
    const dates = [...typicalDates, '2026-11-13'].sort()
    await route.fulfill({
      json: {
        daily: {
          time: dates,
          temperature_2m_max: dates.map((date) =>
            date === '2026-11-13' ? 28 : date.endsWith('-11-29') ? 29 : 30,
          ),
          temperature_2m_min: dates.map((date) =>
            date === '2026-11-13' ? 16 : date.endsWith('-11-29') ? 19 : 20,
          ),
          weather_code: dates.map((date) =>
            date === '2026-11-13' ? 61 : 0,
          ),
        },
      },
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Weather' }).click()
  const calendar = page.getByLabel('Daily weather calendar for November 2026')
  await expect(calendar).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Weather' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(
    calendar.getByRole('article', {
      name: /13 November, Historical reanalysis/,
    }),
  )
    .toContainText('28°')
  await expect(
    calendar.getByRole('article', {
      name: /14 November, Forecast/,
    }),
  ).toContainText('31°')
  await expect(
    calendar.getByRole('article', {
      name: /29 November, Typical conditions, 10-year average/,
    }),
  ).toContainText('29°')
  await expect(
    calendar.getByRole('article', {
      name: /30 November, Typical conditions, 10-year average/,
    }),
  ).toContainText('30°')

  const summary = page.getByRole('complementary', { name: 'Monthly overview' })
  await expect(summary).toContainText('Historical reanalysis')
  await expect(summary).toContainText('Forecast')
  await expect(summary).toContainText('Typical conditions')
  await expect(summary).toContainText('Unavailable')
  await expect(
    page.getByText(/Some dates have no available archive/),
  ).toBeVisible()
  await expect(
    page.locator('.weather-footer').getByRole('link', {
      name: 'Weather data by Open-Meteo.com',
    }),
  ).toHaveAttribute('href', 'https://open-meteo.com/')
  await expect(page.locator('.weather-footer').getByRole('link', {
    name: 'Weather data by Open-Meteo.com',
  })).toHaveCount(1)
  await expect(page.getByText('Delhi 30-day weather calendar')).toBeVisible()
  await expect(
    page.getByText('Temperatures: high / low (top to bottom)'),
  ).toBeVisible()
  const detailsBounds = await page
    .getByRole('article')
    .filter({ hasText: 'Chance of rain' })
    .boundingBox()
  const calendarBounds = await page.locator('#forecast-panel').boundingBox()
  const footerBounds = await page.locator('.weather-footer').boundingBox()
  const disclaimerBounds = await page.locator('.data-footnote').boundingBox()
  const footerDetailsBounds = await page
    .locator('.weather-footer-details')
    .boundingBox()
  const refreshBounds = await page
    .locator('.weather-footer .refresh-button')
    .boundingBox()
  expect(detailsBounds).not.toBeNull()
  expect(calendarBounds).not.toBeNull()
  expect(footerBounds).not.toBeNull()
  expect(disclaimerBounds).not.toBeNull()
  expect(footerDetailsBounds).not.toBeNull()
  expect(refreshBounds).not.toBeNull()
  expect(detailsBounds!.y + detailsBounds!.height).toBeLessThan(calendarBounds!.y)
  expect(calendarBounds!.y + calendarBounds!.height).toBeLessThanOrEqual(
    footerBounds!.y,
  )
  expect(refreshBounds!.x).toBeGreaterThan(footerDetailsBounds!.x)
  expect(
    footerBounds!.x +
      footerBounds!.width -
      refreshBounds!.x -
      refreshBounds!.width,
  ).toBeGreaterThanOrEqual(20)
  expect(footerBounds!.y + footerBounds!.height).toBeLessThan(
    disclaimerBounds!.y,
  )
})

test('navigates months and reloads the calendar for the selected city on mobile', async ({
  page,
}) => {
  await page.clock.install({
    time: new Date('2026-11-14T03:30:00+05:30'),
  })
  await page.setViewportSize({ width: 375, height: 812 })

  const requestedArchiveCoordinates: string[] = []
  const requestedForecastCoordinates: string[] = []
  await page.route(weatherApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('forecast_days') === '16') {
      requestedForecastCoordinates.push(
        `${url.searchParams.get('latitude')},${url.searchParams.get('longitude')}`,
      )
      const dates = Array.from({ length: 16 }, (_, index) =>
        addIsoDays('2026-11-14', index),
      )
      await route.fulfill({
        json: {
          daily: {
            time: dates,
            temperature_2m_max: dates.map(() => 29),
            temperature_2m_min: dates.map(() => 18),
            weather_code: dates.map(() => 1),
          },
        },
      })
      return
    }
    await route.fulfill({ json: currentWeather() })
  })
  await page.route(archiveApiPattern, async (route) => {
    const url = new URL(route.request().url())
    requestedArchiveCoordinates.push(
      `${url.searchParams.get('latitude')},${url.searchParams.get('longitude')}`,
    )
    const dates = Array.from({ length: 10 }, (_, yearIndex) =>
      Array.from({ length: 31 }, (_, dayIndex) => {
        const day = String(dayIndex + 1).padStart(2, '0')
        return `${2016 + yearIndex}-12-${day}`
      }),
    ).flat()
    await route.fulfill({
      json: {
        daily: {
          time: dates,
          temperature_2m_max: dates.map(() => 29),
          temperature_2m_min: dates.map(() => 18),
          weather_code: dates.map(() => 1),
        },
      },
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Weather' }).click()
  await expect(
    page.getByLabel('Daily weather calendar for November 2026'),
  ).toBeVisible()
  const footer = page.locator('.weather-footer')
  const footerBounds = await footer.boundingBox()
  const refreshBounds = await footer.locator('.refresh-button').boundingBox()
  expect(footerBounds).not.toBeNull()
  expect(refreshBounds).not.toBeNull()
  expect(
    footerBounds!.x +
      footerBounds!.width -
      refreshBounds!.x -
      refreshBounds!.width,
  ).toBeGreaterThanOrEqual(16)

  await selectCityBySearch(page, 'Pune')
  await expect(
    page.getByText('Pune 30-day weather calendar', { exact: true }),
  ).toBeVisible()
  await expect.poll(() => requestedArchiveCoordinates.length).toBe(2)
  await expect.poll(() => requestedForecastCoordinates.length).toBe(2)
  expect(requestedForecastCoordinates).toEqual([
    '28.7041,77.1025',
    '18.5204,73.8567',
  ])

  await page.getByRole('button', { name: 'Next month' }).click()
  await expect(
    page.getByRole('heading', { name: 'December 2026' }),
  ).toBeVisible()
  await expect(
    page.locator('.forecast-source-counts').getByText('31', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('complementary', { name: 'Monthly overview' }),
  ).toContainText('Typical conditions')
  const sourceRows = page.locator('.forecast-source-counts > div')
  await expect(sourceRows).toHaveCount(1)
  await expect(sourceRows.first()).toContainText('Typical conditions')
  await expect(sourceRows).not.toContainText('Unavailable')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
    await expect.poll(() => requestedArchiveCoordinates.length).toBe(3)
    expect(requestedArchiveCoordinates).toEqual([
      '28.7041,77.1025',
      '18.5204,73.8567',
      '18.5204,73.8567',
    ])
})

test('reports monthly source failures and retries without losing the city context', async ({
    page,
}) => {
    await page.clock.install({
      time: new Date('2026-11-14T03:30:00+05:30'),
    })
    let shouldFail = true
    await page.route(weatherApiPattern, async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('forecast_days') === '16') {
        if (shouldFail) {
          await route.fulfill({ status: 503, body: 'Unavailable' })
          return
        }
        const dates = Array.from({ length: 16 }, (_, index) =>
          addIsoDays('2026-11-14', index),
        )
        await route.fulfill({
          json: {
            daily: {
              time: dates,
              temperature_2m_max: dates.map(() => 29),
              temperature_2m_min: dates.map(() => 18),
              weather_code: dates.map(() => 1),
            },
          },
        })
        return
      }
      await route.fulfill({ json: currentWeather() })
    })
    await page.route(archiveApiPattern, async (route) => {
      if (shouldFail) {
        await route.fulfill({ status: 503, body: 'Unavailable' })
        return
      }
      await route.fulfill({
        json: {
          daily: {
            time: ['2025-11-30'],
            temperature_2m_max: [28],
            temperature_2m_min: [17],
            weather_code: [2],
          },
        },
      })
    })

    await page.goto('/')
    await page.getByRole('tab', { name: 'Weather' }).click()
    await expect(page.getByRole('alert')).toContainText(
      'Historical and typical weather data could not be loaded',
    )
    await expect(page.getByRole('alert')).toContainText(
      'The 16-day forecast could not be loaded',
    )

    shouldFail = false
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(
      page.getByLabel('Daily weather calendar for November 2026'),
    ).toBeVisible()
    await expect(
      page.getByText('Delhi 30-day weather calendar', { exact: true }),
    ).toBeVisible()
})

test('refreshes weather and displays the live US AQI scale', async ({
  page,
}) => {
  let requestCount = 0
  let nextTemperature = 26
  let airQualityRequestCount = 0
  let nextAqi = 115
  await mockWeather(page, async (route) => {
    requestCount += 1
    await route.fulfill({
      json: currentWeather({
        temperature_2m: nextTemperature,
      }),
    })
  })
  await mockAirQuality(page, async (route) => {
    airQualityRequestCount += 1
    await route.fulfill({
      json: currentAirQuality({ us_aqi: nextAqi }),
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Weather' }).click()
  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
  const requestsBeforeRefresh = requestCount
  nextTemperature = 31
  await page.getByRole('button', { name: 'Refresh weather for Delhi' }).click()
  await expect(page.getByLabel('31 degrees Celsius')).toBeVisible()
  expect(requestCount).toBeGreaterThan(requestsBeforeRefresh)

  nextAqi = 120
  await page.getByRole('tab', { name: 'Air quality' }).click()
  await expect(
    page.getByRole('tabpanel', { name: 'Air quality' }),
  ).toBeVisible()
  await expect(page.getByText('120', { exact: true })).toBeVisible()
  await expect(
    page.locator('.aqi-category').getByText('Unhealthy for Sensitive Groups'),
  ).toBeVisible()
  await expect(page.getByText('US AQI', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Air quality data by Open-Meteo' }),
  ).toBeVisible()

  const airQualityRequestsBeforeRefresh = airQualityRequestCount
  nextAqi = 151
  await page.getByRole('button', { name: 'Refresh air quality for Delhi' }).click()
  await expect(page.getByText('151', { exact: true })).toBeVisible()
  await expect(page.locator('.aqi-category')).toHaveText('Unhealthy')
  expect(airQualityRequestCount).toBe(airQualityRequestsBeforeRefresh + 1)
})

test('shows weather provider errors and retries without invented weather data', async ({
  page,
}) => {
  let requestCount = 0
  await mockWeather(page, async (route) => {
    requestCount += 1
    if (requestCount === 1) {
      await route.fulfill({ status: 503, body: 'Unavailable' })
      return
    }
    await route.fulfill({ json: currentWeather() })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Weather' }).click()
  await expect(page.getByRole('alert')).toContainText('HTTP 503')
  await expect(page.getByLabel('26 degrees Celsius')).toHaveCount(0)

  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
  expect(requestCount).toBe(2)
})

test('shows loading while the weather service is responding', async ({
  page,
}) => {
  let releaseResponse: (() => void) | undefined
  let responseGate = Promise.resolve()
  const holdResponse = () => {
    responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve
    })
  }

  await page.route(weatherApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('forecast_days') === '16') {
      await fulfillDailyWeatherRange(route)
      return
    }

    await responseGate
    await route.fulfill({ json: currentWeather() })
  })

  for (const [index, viewport] of [
    { width: 1280, height: 720 },
    { width: 375, height: 812 },
  ].entries()) {
    holdResponse()
    await page.setViewportSize(viewport)
    if (index === 0) {
      await page.goto('/')
    } else {
      await page.reload()
    }
    await page.getByRole('tab', { name: 'Weather' }).click()

    await expect(page.locator('.weather-state')).toContainText(
      'Loading current weather for Delhi',
    )
    const loadingCardHeight = await page
      .locator('.weather-panel')
      .evaluate((panel) => panel.getBoundingClientRect().height)

    releaseResponse?.()
    await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
    const loadedCardHeight = await page
      .locator('.weather-panel')
      .evaluate((panel) => panel.getBoundingClientRect().height)

    expect(Math.abs(loadedCardHeight - loadingCardHeight)).toBeLessThan(1)
  }
})

test('a late response for the previous city cannot replace the selected city', async ({
  page,
}) => {
  let releaseDelhiResponse: (() => void) | undefined
  let markDelhiRequestStarted: (() => void) | undefined
  let markDelhiRouteFinished: (() => void) | undefined
  const delhiResponseGate = new Promise<void>((resolve) => {
    releaseDelhiResponse = resolve
  })
  const delhiRequestStarted = new Promise<void>((resolve) => {
    markDelhiRequestStarted = resolve
  })
  const delhiRouteFinished = new Promise<void>((resolve) => {
    markDelhiRouteFinished = resolve
  })

  await page.route(weatherApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('latitude') === '28.7041') {
      markDelhiRequestStarted?.()
      await delhiResponseGate
      if (!route.request().failure()) {
        await route.fulfill({
          json: currentWeather({ temperature_2m: 19 }),
        })
      }
      markDelhiRouteFinished?.()
      return
    }

    await route.fulfill({
      json: currentWeather({ temperature_2m: 31 }),
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Weather' }).click()
  await delhiRequestStarted
  const previousCityRequestFailed = page.waitForEvent(
    'requestfailed',
    (request) =>
      request.url().includes('latitude=28.7041') &&
      request.url().includes('longitude=77.1025'),
  )

  await selectCityBySearch(page, 'Pune')
  await expect(page.getByLabel('31 degrees Celsius')).toBeVisible()
  await previousCityRequestFailed

  releaseDelhiResponse?.()
  await delhiRouteFinished
  await expect(page.getByRole('heading', { name: 'Pune, Maharashtra' })).toBeVisible()
  await expect(page.getByLabel('31 degrees Celsius')).toBeVisible()
  await expect(page.getByLabel('19 degrees Celsius')).toHaveCount(0)
})

test('shows air-quality loading while Open-Meteo responds', async ({ page }) => {
  let releaseResponse: (() => void) | undefined
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve
  })

  await mockWeather(page)
  await page.route(airQualityApiPattern, async (route) => {
    await responseGate
    await route.fulfill({ json: currentAirQuality() })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Air quality' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Loading current air quality for Delhi',
  )

  releaseResponse?.()
  await expect(page.getByText('115', { exact: true })).toBeVisible()
})

test('shows air-quality provider errors and retries without sample values', async ({
  page,
}) => {
  let requestCount = 0
  await mockWeather(page)
  await mockAirQuality(page, async (route) => {
    requestCount += 1
    if (requestCount === 1) {
      await route.fulfill({ status: 503, body: 'Unavailable' })
      return
    }
    await route.fulfill({ json: currentAirQuality() })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Air quality' }).click()
  await expect(page.getByRole('alert')).toContainText('HTTP 503')
  await expect(page.getByText('115', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByText('115', { exact: true })).toBeVisible()
  expect(requestCount).toBe(2)
})

test('rejects invalid air-quality data rather than displaying it', async ({
  page,
}) => {
  await mockWeather(page)
  await mockAirQuality(page, async (route) => {
    await route.fulfill({
      json: currentAirQuality({ pm2_5: null }),
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Air quality' }).click()
  await expect(page.getByRole('alert')).toContainText('incomplete or invalid')
  await expect(page.getByText('115', { exact: true })).toHaveCount(0)
})

test('rejects invalid pollutant concentrations rather than showing partial data', async ({
  page,
}) => {
  await mockWeather(page)
  await mockAirQuality(page, async (route) => {
    await route.fulfill({
      json: currentAirQuality({ carbon_monoxide: null }),
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Air quality' }).click()
  await expect(page.getByRole('alert')).toContainText('incomplete or invalid')
  await expect(page.getByText('115', { exact: true })).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'Major air pollutants' }),
  ).toHaveCount(0)
})

test('shows six pollutant cards in a responsive grid', async ({ page }) => {
  await mockWeather(page)
  await mockAirQuality(page)
  await page.goto('/')
  await page.getByRole('tab', { name: 'Air quality' }).click()

  const pollutants = page.getByRole('region', { name: 'Major air pollutants' })
  await expect(pollutants).toBeVisible()
  await expect(pollutants.getByRole('article')).toHaveCount(6)

  const grid = pollutants.locator('.pollutant-grid')
  for (const [width, expectedColumns] of [
    [1280, 3],
    [800, 2],
    [375, 1],
  ]) {
    await page.setViewportSize({ width, height: 900 })
    const columnCount = await grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    )
    expect(columnCount).toBe(expectedColumns)
  }
})

test('a late AQI response for a previous city cannot replace the selection', async ({
  page,
}) => {
  let releaseDelhiResponse: (() => void) | undefined
  let markDelhiRequestStarted: (() => void) | undefined
  let markDelhiRouteFinished: (() => void) | undefined
  const delhiResponseGate = new Promise<void>((resolve) => {
    releaseDelhiResponse = resolve
  })
  const delhiRequestStarted = new Promise<void>((resolve) => {
    markDelhiRequestStarted = resolve
  })
  const delhiRouteFinished = new Promise<void>((resolve) => {
    markDelhiRouteFinished = resolve
  })

  await mockWeather(page)
  await page.route(airQualityApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('latitude') === '28.7041') {
      markDelhiRequestStarted?.()
      try {
        await delhiResponseGate
        if (!route.request().failure()) {
          await route.fulfill({
            json: currentAirQuality({ us_aqi: 25 }),
          })
        }
      } finally {
        markDelhiRouteFinished?.()
      }
      return
    }

    await route.fulfill({
      json: currentAirQuality({ us_aqi: 151 }),
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Air quality' }).click()
  await delhiRequestStarted
  const previousCityRequestFailed = page.waitForEvent(
    'requestfailed',
    (request) =>
      request.url().includes('latitude=28.7041') &&
      request.url().includes('longitude=77.1025'),
  )

  await selectCityBySearch(page, 'Pune')
  await expect(page.getByText('151', { exact: true })).toBeVisible()
  await previousCityRequestFailed

  releaseDelhiResponse?.()
  await delhiRouteFinished
  await expect(page.getByRole('heading', { name: 'Pune, Maharashtra' })).toBeVisible()
  await expect(page.getByText('151', { exact: true })).toBeVisible()
  await expect(page.getByText('25', { exact: true })).toHaveCount(0)
})

test('supports tab keyboard navigation and a narrow mobile viewport', async ({
  page,
}) => {
  await mockWeather(page)
  await mockAirQuality(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(
    page.getByText('Air quality · Model-based estimates'),
  ).toBeVisible()

  const weatherTab = page.getByRole('tab', { name: 'Weather' })
  const aqiTab = page.getByRole('tab', { name: 'Air quality' })

  await expect(aqiTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('115', { exact: true })).toBeVisible()

  await aqiTab.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(weatherTab).toBeFocused()
  await expect(weatherTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()

  await page.keyboard.press('ArrowRight')
  await expect(aqiTab).toBeFocused()
  await expect(aqiTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('115', { exact: true })).toBeVisible()
  await expect(page.locator('#forecast-panel')).toBeHidden()
  await expect(page.locator('.weather-footer')).toBeHidden()

  await page.keyboard.press('ArrowLeft')
  await expect(weatherTab).toBeFocused()
  await expect(weatherTab).toHaveAttribute('aria-selected', 'true')

  const citySearch = page.getByRole('combobox', { name: 'Search cities' })
  await citySearch.fill('del')
  await expect(page.getByRole('listbox', { name: 'Matching cities' })).toBeVisible()
  await expect(
    page.getByRole('option', { name: /^Delhi, Delhi / }),
  ).toBeVisible()
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})

test('filters cities and supports keyboard selection', async ({ page }) => {
  await mockWeather(page)
  await page.goto('/')

  const search = page.getByRole('combobox', { name: 'Search cities' })
  await expect(search).toHaveValue('')
  await expect(search).toHaveAttribute(
    'placeholder',
    'Search Indian cities or states',
  )
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
  await search.fill('de')
  await expect(
    page.getByRole('listbox', { name: 'Matching cities' }),
  ).toBeHidden()
  await search.fill('vizag')
  await expect(
    page.getByRole('option', { name: 'Visakhapatnam, Andhra Pradesh' }),
  ).toBeVisible()
  await search.press('ArrowDown')
  await search.press('Enter')

  await expect(
    page.getByRole('heading', { name: 'Visakhapatnam, Andhra Pradesh' }),
  ).toBeVisible()
  await expect(search).toHaveValue('')
  await expect(search).toHaveAttribute(
    'placeholder',
    'Search Indian cities or states',
  )

  await search.fill('not a city')
  await expect(
    page.getByRole('option', { name: 'No matching cities found.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Visakhapatnam, Andhra Pradesh' }),
  ).toBeVisible()
})

test('shows source population and licensing without adding a Census tab', async ({
  page,
}) => {
  await mockWeather(page)
  await page.goto('/')

  const cityDetails = page.locator('.city-details')
  await expect(cityDetails.locator('summary')).toHaveText('City information')
  await expect(cityDetails).not.toHaveAttribute('open', '')
  await cityDetails.locator('summary').click()
  await expect(
    cityDetails.getByText('2011 Census population: 1,10,34,555'),
  ).toBeVisible()
  const search = page.getByRole('combobox', { name: 'Search cities' })
  await search.fill('Mumbai')

  await expect(
    page.getByRole('option', { name: /Mumbai, Maharashtra.*1,24,42,373/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Wikipedia contributors' }),
  ).toHaveAttribute('href', CITY_POPULATION_SOURCE)
  await expect(page.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute(
    'href',
    CITY_POPULATION_LICENSE,
  )

  await page.getByRole('option', { name: /Mumbai, Maharashtra/ }).first().click()
  await expect(
    page.getByRole('heading', { name: 'Mumbai, Maharashtra' }),
  ).toBeVisible()
  await expect(
    page.getByText('2011 Census population: 1,24,42,373'),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Wikipedia contributors' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Census' })).toHaveCount(0)
})

test('uses device location on request to select the nearest supported city', async ({
  page,
}) => {
  const requestedLocations: string[] = []
  await mockWeather(page, async (route) => {
    const url = new URL(route.request().url())
    requestedLocations.push(
      `${url.searchParams.get('latitude')},${url.searchParams.get('longitude')}`,
    )
    await route.fulfill({ json: currentWeather() })
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          document.documentElement.dataset.locationCalls = '1'
          success({
            coords: {
              latitude: 12.9716,
              longitude: 77.5946,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          })
        },
      },
    })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
  expect(
    await page.locator('html').getAttribute('data-location-calls'),
  ).toBeNull()
  const idleHeaderHeight = await page
    .locator('.topbar')
    .evaluate((header) => header.getBoundingClientRect().height)

  await page.getByRole('button', { name: 'Use my location' }).click()
  await expect(
    page.getByRole('heading', { name: 'Bengaluru, Karnataka' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toContainText(
    'nearest supported city',
  )
  const locatedHeaderHeight = await page
    .locator('.topbar')
    .evaluate((header) => header.getBoundingClientRect().height)
  expect(Math.abs(locatedHeaderHeight - idleHeaderHeight)).toBeLessThan(1)
  await expect.poll(() => requestedLocations.length).toBe(2)
  expect(requestedLocations).toContain('12.9716,77.5946')
})

test('shows location permission errors without changing the selected city', async ({
  page,
}) => {
  await mockWeather(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: PositionCallback,
          error: PositionErrorCallback,
        ) => {
          error({
            code: 1,
            message: 'User denied location access.',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          })
        },
      },
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Use my location' }).click()
  await expect(page.getByRole('alert')).toContainText('permission was denied')
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
})

test('keeps a manual city choice when a pending location lookup completes late', async ({
  page,
}) => {
  await mockWeather(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          window.setTimeout(() => {
            document.documentElement.dataset.locationResolved = 'true'
            success({
              coords: {
                latitude: 12.9716,
                longitude: 77.5946,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            })
          }, 300)
        },
      },
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Use my location' }).click()
  await selectCityBySearch(page, 'Delhi')
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute(
    'data-location-resolved',
    'true',
  )
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
})

test('a late response for the previous calendar month cannot replace the viewed month', async ({
  page,
}) => {
  await page.clock.install({
    time: new Date('2026-11-14T03:30:00+05:30'),
  })
  await page.route(weatherApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('forecast_days') === '16') {
      const dates = Array.from({ length: 16 }, (_, index) =>
        addIsoDays('2026-11-14', index),
      )
      await route.fulfill({
        json: {
          daily: {
            time: dates,
            temperature_2m_max: dates.map(() => 29),
            temperature_2m_min: dates.map(() => 18),
            weather_code: dates.map(() => 1),
          },
        },
      })
      return
    }
    await route.fulfill({ json: currentWeather() })
  })

  let releasePreviousArchive: (() => void) | undefined
  let markPreviousArchiveStarted: (() => void) | undefined
  let markPreviousArchiveFinished: (() => void) | undefined
  const previousArchiveGate = new Promise<void>((resolve) => {
    releasePreviousArchive = resolve
  })
  const previousArchiveStarted = new Promise<void>((resolve) => {
    markPreviousArchiveStarted = resolve
  })
  const previousArchiveFinished = new Promise<void>((resolve) => {
    markPreviousArchiveFinished = resolve
  })
  await page.route(archiveApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('start_date') === '2016-11-01') {
      markPreviousArchiveStarted?.()
      try {
        await previousArchiveGate
        if (!route.request().failure()) {
          await route.fulfill({
            json: {
              daily: {
                time: ['2025-11-30'],
                temperature_2m_max: [20],
                temperature_2m_min: [10],
                weather_code: [3],
              },
            },
          })
        }
      } finally {
        markPreviousArchiveFinished?.()
      }
      return
    }

    const dates = Array.from({ length: 31 }, (_, index) =>
      `2025-12-${String(index + 1).padStart(2, '0')}`,
    )
    await route.fulfill({
      json: {
        daily: {
          time: dates,
          temperature_2m_max: dates.map(() => 28),
          temperature_2m_min: dates.map(() => 17),
          weather_code: dates.map(() => 2),
        },
      },
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Weather' }).click()
  await previousArchiveStarted
  const previousArchiveCancelled = page.waitForEvent(
    'requestfailed',
    (request) =>
      request.url().includes('archive-api.open-meteo.com') &&
      request.url().includes('start_date=2016-11-01'),
  )

  await page.getByRole('button', { name: 'Next month' }).click()
  await expect(
    page.getByRole('heading', { name: 'December 2026' }),
  ).toBeVisible()
  await expect(
    page.locator('.forecast-source-counts').getByText('31', { exact: true }),
  ).toBeVisible()
  await previousArchiveCancelled

  releasePreviousArchive?.()
  await previousArchiveFinished
  await expect(
    page.getByRole('heading', { name: 'December 2026' }),
  ).toBeVisible()
  await expect(
    page.locator('.forecast-source-counts').getByText('31', { exact: true }),
  ).toBeVisible()
})

test('rejects invalid provider data rather than displaying weather', async ({
  page,
}) => {
  await mockWeather(page, async (route) => {
    await route.fulfill({
      json: currentWeather({ relative_humidity_2m: 180 }),
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Weather' }).click()
  await expect(page.getByRole('alert')).toContainText('incomplete or invalid')
  await expect(page.getByLabel('26 degrees Celsius')).toHaveCount(0)
})

test('rejects invalid forecast details rather than displaying partial weather', async ({
  page,
}) => {
  await page.route(weatherApiPattern, async (route) => {
    const response = currentWeather()
    response.hourly.precipitation_probability[0] = 120
    await route.fulfill({ json: response })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Weather' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'incomplete or invalid forecast details',
  )
  await expect(page.getByLabel('26 degrees Celsius')).toHaveCount(0)
  await expect(page.getByText('Chance of rain')).toHaveCount(0)
})
