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
  await expect(page.getByRole('heading', { name: 'Delhi, Delhi' })).toBeVisible()
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

  await selectCityBySearch(page, 'Pune')
  await expect.poll(() => requestedAirQualityRequests.length).toBe(2)
  expect(requestedAirQualityRequests).toEqual([
    {
      latitude: '28.7041',
      longitude: '77.1025',
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
  ).toEqual(new Set(['18.5204,73.8567', '28.7041,77.1025']))
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
  await page.getByRole('button', { name: 'Refresh weather for Delhi' }).click()
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
  await page.getByRole('button', { name: 'Refresh air quality for Delhi' }).click()
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
  let responseGate = Promise.resolve()
  const holdResponse = () => {
    responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve
    })
  }

  await page.route(weatherApiPattern, async (route) => {
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

    await expect(page.getByRole('status')).toContainText(
      'Loading current weather for Delhi',
    )
    const loadingCardHeight = await page
      .locator('.dashboard-card')
      .evaluate((card) => card.getBoundingClientRect().height)

    releaseResponse?.()
    await expect(page.getByLabel('26 degrees Celsius')).toBeVisible()
    const loadedCardHeight = await page
      .locator('.dashboard-card')
      .evaluate((card) => card.getBoundingClientRect().height)

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

  await expect(page.getByText('2011 Census population: 1,10,34,555')).toBeVisible()
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
