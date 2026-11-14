---
name: aqi-history-chart
description: Guidance for BreatheSafe's responsive historical US AQI and particulate chart.
---

# AQI History Chart

## Approved scope

- Add a historical chart below the six current pollutant cards.
- Provide 25 Hours, 7 Days, 30 Days, and 3 Months (90 days) as available ranges.
- Keep 1 Year and 10 Years visible but disabled while unavailable from the current India data source.
- Offer US AQI, PM2.5, and PM10 when the selected series has valid values.
- Provide bar and line modes, defaulting to bars.
- For 7-day, 30-day, and 3-month ranges, plot daily peaks from the 3-hourly series.
- Color chart marks by U.S. AQI category; PM2.5 and PM10 use their pollutant-specific AQI indices.

## Data and product rules

- Use Open-Meteo's Air Quality API and its US AQI, PM2.5, and PM10 hourly variables.
- For India, the global CAMS series is model-based and 3-hourly. Request no more than 92 past days; never claim it provides hourly observations or 1-/10-year history.
- Do not interpolate missing values or present them as zero. Label the chart as modeled estimates, not local station readings.
- Request data only for the selected city while Air quality is open; cancel superseded requests, set a timeout, and provide retry for errors.
- Keep Open-Meteo attribution and the CC BY 4.0 licence link. The free endpoint is for non-commercial use.
- Match the Weather calendar's light sage/white visual theme and support narrow screens and keyboard use.

## Acceptance criteria

1. The chart appears below pollutant cards and defaults to 25 Hours and US AQI.
2. Range, metric, and bar/line controls update the chart from validated API data.
3. The 25-hour view uses actual 3-hour samples; 7-day, 30-day, and 3-month views show labeled daily peaks.
4. 1 Year and 10 Years are disabled with a clear 92-day-history availability explanation.
5. Loading, error/retry, and empty/missing-data states do not show fabricated values.
6. Playwright covers selectors, aggregation, chart mode, request/error states, and mobile layout.
7. PM2.5/PM10 severity colors use the matching pollutant-specific U.S. AQI series; unavailable severity is neutral and identified in the color key.

## Verification

- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`

## Verified implementation

- The chart is rendered after the pollutant cards and keeps the selected city, metric, range, and chart style in the browser UI.
- It requests 92 past days of Open-Meteo CAMS Global data only while the Air quality panel is active. The 25-hour window plots returned 3-hour samples; longer ranges aggregate daily maxima using India local dates.
- The 3-month view filters to 90 days. 1 Year and 10 Years remain disabled with an explanation of the 92-day provider limit.
- Missing values remain missing, and history failures can be retried without hiding current AQI data.
- PM2.5 and PM10 chart marks use `us_aqi_pm2_5` and `us_aqi_pm10` to derive category colors. The legend explains each category and marks unavailable severity as neutral; tooltips and the accessible data table include the category.
- Trend controls use the app's typography and 44px touch targets. The desktop AQI illustration frame uses `contain` to avoid clipping landscape artwork, while mobile retains its existing crop behavior.
- Verified commands: `npm.cmd run test:e2e -- --grep "charts history|retries failed history|empty history|opens the Air quality tab"` (4 passed), `npm.cmd run test:e2e` (31 passed), `npm.cmd run build`, and `npm.cmd run lint`.

Official references:

- Air Quality API: https://open-meteo.com/en/docs/air-quality-api
- Terms: https://open-meteo.com/en/terms
- Attribution/licence: https://open-meteo.com/en/licence
