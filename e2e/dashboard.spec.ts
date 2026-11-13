import { expect, test, type Page, type Route } from '@playwright/test'

const weatherApiPattern = 'https://api.open-meteo.com/v1/forecast**'
const airQualityApiPattern =
  'https://air-quality-api.open-meteo.com/v1/air-quality**'

function currentWeather(overrides: Record<string, unknown> = {}) {
  return {
    current: {
      time: '2026-11-14T02:00',
      temperature_2m: 26.4,
      relative_humidity_2m: 68,
      weather_code: 2,
      wind_speed_10m: 12.6,
      wind_direction_10m: 90,
      ...overrides,
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
      ...overrides,
    },
  }
}

async function mockWeather(page: Page, response?: (route: Route) => Promise<void>) {
  await page.route(weatherApiPattern, async (route) => {
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
) {
  await page.route(airQualityApiPattern, async (route) => {
    if (response) {
      await response(route)
      return
    }

    await route.fulfill({ json: currentAirQuality() })
  })
}

test('loads selected-city weather and requests live AQI only when its tab opens', async ({
  page,
}) => {
  const requestedLocations: Array<{ latitude: string | null; longitude: string | null }> =
    []
  const requestedAirQualityRequests: Array<{
    latitude: string | null
    longitude: string | null
    current: string | null
    timezone: string | null
  }> = []
  await mockWeather(page, async (route) => {
    const url = new URL(route.request().url())
    requestedLocations.push({
      latitude: url.searchParams.get('latitude'),
      longitude: url.searchParams.get('longitude'),
    })
    await route.fulfill({ json: currentWeather() })
  })
  await mockAirQuality(page, async (route) => {
    const url = new URL(route.request().url())
    requestedAirQualityRequests.push({
      latitude: url.searchParams.get('latitude'),
      longitude: url.searchParams.get('longitude'),
      current: url.searchParams.get('current'),
      timezone: url.searchParams.get('timezone'),
    })
    await route.fulfill({ json: currentAirQuality() })
  })

  await page.goto('/')

  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
  await expect(page.getByText('Partly cloudy')).toBeVisible()
  await expect(page.getByText('68%', { exact: true })).toBeVisible()
  await expect(page.getByText('13 km/h', { exact: false })).toBeVisible()
  await expect(page.getByText(/Model time 14 Nov 2026, 2:00 am IST/)).toBeVisible()

  const attribution = page.getByRole('link', {
    name: 'Weather data by Open-Meteo.com',
  })
  await expect(attribution).toHaveAttribute('href', 'https://open-meteo.com/')
  await expect(
    page.getByText('Air quality · Model-based estimates'),
  ).toBeVisible()
  expect(requestedAirQualityRequests).toHaveLength(0)

  await page.getByLabel('City', { exact: true }).selectOption('delhi')
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
  expect(requestedAirQualityRequests).toHaveLength(0)

  await page.getByRole('tab', { name: 'Air quality' }).click()
  await expect(page.getByText('115', { exact: true })).toBeVisible()
  await expect(page.getByText('Unhealthy for Sensitive Groups')).toBeVisible()
  await expect(page.getByText('40.4 µg/m³')).toBeVisible()
  await expect(page.getByText('46.1 µg/m³')).toBeVisible()
  await expect(page.getByText(/Model time 14 Nov 2026, 1:30 am IST/)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Air quality data by Open-Meteo' }),
  ).toHaveAttribute('href', 'https://open-meteo.com/')
  await expect(
    page.getByRole('link', { name: 'CC BY 4.0 licence' }),
  ).toHaveAttribute('href', 'https://open-meteo.com/en/licence')

  await page.getByLabel('City', { exact: true }).selectOption('pune')
  await expect.poll(() => requestedAirQualityRequests.length).toBe(2)
  expect(requestedAirQualityRequests).toEqual([
    {
      latitude: '28.6139',
      longitude: '77.209',
      current: 'us_aqi,pm2_5,pm10',
      timezone: 'Asia/Kolkata',
    },
    {
      latitude: '18.5204',
      longitude: '73.8567',
      current: 'us_aqi,pm2_5,pm10',
      timezone: 'Asia/Kolkata',
    },
  ])
  expect(
    new Set(requestedLocations.map(({ latitude, longitude }) => `${latitude},${longitude}`)),
  ).toEqual(new Set(['18.5204,73.8567', '28.6139,77.209']))
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
  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
  const requestsBeforeRefresh = requestCount
  nextTemperature = 31
  await page.getByRole('button', { name: 'Refresh weather for Pune' }).click()
  await expect(page.getByLabel('31 degrees Celsius')).toBeVisible()
  expect(requestCount).toBeGreaterThan(requestsBeforeRefresh)

  await page.getByRole('tab', { name: 'Air quality' }).click()
  await expect(
    page.getByRole('tabpanel', { name: 'Air quality' }),
  ).toBeVisible()
  await expect(page.getByText('115', { exact: true })).toBeVisible()
  await expect(page.getByText('Unhealthy for Sensitive Groups')).toBeVisible()
  await expect(page.getByText('US AQI', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Air quality data by Open-Meteo' }),
  ).toBeVisible()

  nextAqi = 151
  await page.getByRole('button', { name: 'Refresh air quality for Pune' }).click()
  await expect(page.getByText('151', { exact: true })).toBeVisible()
  await expect(page.getByText('Unhealthy', { exact: true })).toBeVisible()
  expect(airQualityRequestCount).toBe(2)
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
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve
  })

  await page.route(weatherApiPattern, async (route) => {
    await responseGate
    await route.fulfill({ json: currentWeather() })
  })

  await page.goto('/')
  await expect(page.getByRole('status')).toContainText(
    'Loading current weather for Pune',
  )

  releaseResponse?.()
  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
})

test('a late response for the previous city cannot replace the selected city', async ({
  page,
}) => {
  let releasePuneResponse: (() => void) | undefined
  let markPuneRequestStarted: (() => void) | undefined
  let markPuneRouteFinished: (() => void) | undefined
  const puneResponseGate = new Promise<void>((resolve) => {
    releasePuneResponse = resolve
  })
  const puneRequestStarted = new Promise<void>((resolve) => {
    markPuneRequestStarted = resolve
  })
  const puneRouteFinished = new Promise<void>((resolve) => {
    markPuneRouteFinished = resolve
  })

  await page.route(weatherApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('latitude') === '18.5204') {
      markPuneRequestStarted?.()
      await puneResponseGate
      if (!route.request().failure()) {
        await route.fulfill({
          json: currentWeather({ temperature_2m: 19 }),
        })
      }
      markPuneRouteFinished?.()
      return
    }

    await route.fulfill({
      json: currentWeather({ temperature_2m: 31 }),
    })
  })

  await page.goto('/')
  await puneRequestStarted
  const previousCityRequestFailed = page.waitForEvent(
    'requestfailed',
    (request) =>
      request.url().includes('latitude=18.5204') &&
      request.url().includes('longitude=73.8567'),
  )

  await page.getByLabel('City', { exact: true }).selectOption('delhi')
  await expect(page.getByLabel('31 degrees Celsius')).toBeVisible()
  await previousCityRequestFailed

  releasePuneResponse?.()
  await puneRouteFinished
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
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
    'Loading current air quality for Pune',
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

test('a late AQI response for a previous city cannot replace the selection', async ({
  page,
}) => {
  let releasePuneResponse: (() => void) | undefined
  let markPuneRequestStarted: (() => void) | undefined
  let markPuneRouteFinished: (() => void) | undefined
  const puneResponseGate = new Promise<void>((resolve) => {
    releasePuneResponse = resolve
  })
  const puneRequestStarted = new Promise<void>((resolve) => {
    markPuneRequestStarted = resolve
  })
  const puneRouteFinished = new Promise<void>((resolve) => {
    markPuneRouteFinished = resolve
  })

  await mockWeather(page)
  await page.route(airQualityApiPattern, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('latitude') === '18.5204') {
      markPuneRequestStarted?.()
      try {
        await puneResponseGate
        if (!route.request().failure()) {
          await route.fulfill({
            json: currentAirQuality({ us_aqi: 25 }),
          })
        }
      } finally {
        markPuneRouteFinished?.()
      }
      return
    }

    await route.fulfill({
      json: currentAirQuality({ us_aqi: 151 }),
    })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'Air quality' }).click()
  await puneRequestStarted
  const previousCityRequestFailed = page.waitForEvent(
    'requestfailed',
    (request) =>
      request.url().includes('latitude=18.5204') &&
      request.url().includes('longitude=73.8567'),
  )

  await page.getByLabel('City', { exact: true }).selectOption('delhi')
  await expect(page.getByText('151', { exact: true })).toBeVisible()
  await previousCityRequestFailed

  releasePuneResponse?.()
  await puneRouteFinished
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
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
  await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
  await expect(
    page.getByText('Air quality · Model-based estimates'),
  ).toBeVisible()

  const weatherTab = page.getByRole('tab', { name: 'Weather' })
  const aqiTab = page.getByRole('tab', { name: 'Air quality' })

  await weatherTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(aqiTab).toBeFocused()
  await expect(aqiTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('115', { exact: true })).toBeVisible()

  await page.keyboard.press('ArrowLeft')
  await expect(weatherTab).toBeFocused()
  await expect(weatherTab).toHaveAttribute('aria-selected', 'true')

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
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
  await expect(page.getByRole('alert')).toContainText('incomplete or invalid')
  await expect(page.getByLabel('26 degrees Celsius')).toHaveCount(0)
})
