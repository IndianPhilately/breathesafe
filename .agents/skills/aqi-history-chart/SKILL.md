---
name: aqi-history-chart
description: Guidance for BreatheSafe's responsive historical US AQI and particulate chart.
---

# AQI History Chart

## Approved scope

- Add a historical chart below the six current pollutant cards.
- Provide 24 Hours, 7 Days, 30 Days, and 3 Months (90 days) as available ranges.
- Keep 1 Year and 10 Years visible but disabled while unavailable from the current India data source.
- Offer US AQI, PM2.5, and PM10 when the selected series has valid values.
- Provide bar and line modes, defaulting to bars.
- For 7-day, 30-day, and 3-month ranges, plot daily peaks from the 3-hourly series.
- Color U.S. AQI marks by AQI category and PM2.5/PM10 marks by concentration category.
- Switch the color key to the selected measure's numeric ranges; show PM ranges in µg/m³.

## Data and product rules

- Use Open-Meteo's Air Quality API and its US AQI, PM2.5, and PM10 hourly variables.
- For India, the global CAMS series is model-based and 3-hourly. Request no more than 92 past days; never claim it provides hourly observations or 1-/10-year history.
- Do not interpolate missing values or present them as zero. Label the chart as modeled estimates, not local station readings.
- Use the U.S. AQI PM concentration breakpoints for PM bands. Since official AQI uses 24-hour averages and this chart displays modeled samples or daily peaks, describe PM categories as indicative rather than official AQI readings.
- Request data only for the selected city while Air quality is open; cancel superseded requests, set a timeout, and provide retry for errors.
- Keep Open-Meteo attribution and the CC BY 4.0 licence link. The free endpoint is for non-commercial use.
- Match the Weather calendar's light sage/white visual theme and support narrow screens and keyboard use.

## Acceptance criteria

1. The chart appears below pollutant cards and defaults to 30 Days and US AQI.
2. Range, metric, and bar/line controls update the chart from validated API data.
3. The 24-hour view uses actual 3-hour samples; 7-day, 30-day, and 3-month views show labeled daily peaks.
4. 1 Year and 10 Years are disabled with a clear 92-day-history availability explanation.
5. Loading, error/retry, and empty/missing-data states do not show fabricated values.
6. Playwright covers selectors, aggregation, chart mode, request/error states, and mobile layout.
7. Each bar uses the matching category color: U.S. AQI values use AQI bands, while PM2.5/PM10 values use their concentration breakpoints.
8. The color key switches ranges and units with the selected measure. PM legends show µg/m³ concentration bands and explain that they are indicative because official AQI uses 24-hour averages.

## Verification

- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`

## Verified implementation

- The chart is rendered after the pollutant cards and keeps the selected city, metric, range, and chart style in the browser UI.
- It requests 92 past days of Open-Meteo CAMS Global data only while the Air quality panel is active. The 24-hour window plots returned 3-hour samples; longer ranges aggregate daily maxima using India local dates.
- The 3-month view filters to 90 days. 1 Year and 10 Years remain disabled with an explanation of the 92-day provider limit.
- Missing values remain missing, and history failures can be retried without hiding current AQI data.
- PM2.5 chart colors use concentration bands 0.0–9.0, 9.1–35.4, 35.5–55.4, 55.5–125.4, 125.5–225.4, and 225.5+ µg/m³. PM10 uses 0–54, 55–154, 155–254, 255–354, 355–424, and 425+ µg/m³. Concentrations are truncated to tenths for PM2.5 and whole numbers for PM10 before categorization.
- The U.S. AQI color key remains Good 0–50, Moderate 51–100, Unhealthy for Sensitive Groups 101–150, Unhealthy 151–200, Very Unhealthy 201–300, and Hazardous 301+.
- PM concentration colors and legend ranges use the same selected pollutant's raw concentration. Tooltips and the accessible data table include the resulting category; the legend notes that the bands are indicative, not official AQI readings, because the chart shows modeled samples/daily peaks rather than official 24-hour averages.
- Trend controls use the app's typography and 44px touch targets. The desktop AQI illustration frame uses `contain` to avoid clipping landscape artwork, while mobile retains its existing crop behavior.
- Verified commands: `npm.cmd run test:e2e -- --grep "charts history across ranges"` (1 passed), `npm.cmd run test:e2e` (30 passed), `npm.cmd run build`, and `npm.cmd run lint`.

Official references:

- Air Quality API: https://open-meteo.com/en/docs/air-quality-api
- AirNow technical assistance document for U.S. AQI breakpoints: https://www.airnow.gov/publications/air-quality-index/technical-assistance-document-for-reporting-the-daily-aqi/
- Terms: https://open-meteo.com/en/terms
- Attribution/licence: https://open-meteo.com/en/licence
