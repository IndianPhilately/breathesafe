import { expect, test } from '@playwright/test'

test('selecting a city updates its weather and AQI demo details', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Pune, Maharashtra' }),
  ).toBeVisible()
  await expect(page.getByText('Demo data · Not live')).toBeVisible()

  const citySelect = page.getByLabel('City', { exact: true })
  const cityOptions = citySelect.locator('option')
  await expect(cityOptions).toHaveCount(10)

  for (const cityName of await cityOptions.allTextContents()) {
    await citySelect.selectOption({ label: cityName })
    await expect(
      page.getByRole('heading', { name: cityName }),
    ).toBeVisible()
  }

  await citySelect.selectOption('delhi')

  await expect(
    page.getByRole('heading', { name: 'Delhi, Delhi' }),
  ).toBeVisible()
  await expect(
    page.getByLabel('28 degrees Celsius (demo)'),
  ).toBeVisible()

  await page.getByRole('tab', { name: 'Air quality' }).click()
  await expect(
    page.getByRole('tabpanel', { name: 'Air quality' }),
  ).toBeVisible()
  await expect(page.getByText('184', { exact: true })).toBeVisible()
  await expect(page.getByText('Moderate', { exact: true })).toBeVisible()
  await expect(page.getByText('Demo data · Not live')).toBeVisible()
})

test('weather and AQI tabs support arrow-key navigation', async ({ page }) => {
  await page.goto('/')

  const weatherTab = page.getByRole('tab', { name: 'Weather' })
  const aqiTab = page.getByRole('tab', { name: 'Air quality' })

  await weatherTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(aqiTab).toBeFocused()
  await expect(aqiTab).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('ArrowLeft')
  await expect(weatherTab).toBeFocused()
  await expect(weatherTab).toHaveAttribute('aria-selected', 'true')
})

test('dashboard fits a narrow mobile viewport without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  await expect(page.getByLabel('City', { exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Weather' })).toBeVisible()
  await expect(page.getByText('Demo data · Not live')).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
