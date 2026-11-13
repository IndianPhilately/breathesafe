---
name: monthly-weather-calendar
description: Guidance for BreatheSafe's monthly weather calendar combining forecast, historical reanalysis, and climatological averages.
---

# Monthly Weather Calendar

## Approved scope

- Add a month-view calendar for the selected city using Open-Meteo data.
- For dates before today, use Open-Meteo Archive/ERA5 historical reanalysis and label it as modeled historical data, not station observations.
- For today through up to 15 subsequent days, use valid daily values returned by the Forecast API (up to 16 dates total) and label them as forecast.
- For later dates, show the 10-year average for the same month/day from prior completed years and label it as typical conditions, not a forecast.
- Preserve existing current weather, AQI, city search, attribution, and device-location behavior.
- No new dependencies or paid services.

## Data and product rules

- Use the selected city's maintained coordinates and `Asia/Kolkata` local calendar dates.
- Never fill unavailable historical archive dates with fabricated or unlabeled values.
- Do not combine reanalysis, forecast, and typical-condition values without clearly identifying their source.
- A 10-year date-matched average is a climatological reference, not an actual prediction.
- Cancel stale requests when the selected city or viewed month changes.
- Keep requests on-demand when Forecast is opened or the city/month changes; do not poll.

## Implemented behavior

- `src/services/openMeteoMonthly.ts` requests daily forecast data from the Forecast API and date-range data from the Archive API in parallel.
- Forecast dates are limited to rows with validated daily values actually returned by the provider. A trailing null forecast date falls through to the date-matched typical average.
- Typical highs/lows are arithmetic means for each month/day over the previous 10 completed years; the displayed icon uses the most frequent valid WMO code.
- The calendar appears below current-weather details in the Weather tab, supports month navigation, shows source-specific counts and warning states, and cancels superseded city/month requests.
- Historical and typical values use Open-Meteo Archive/ERA5, are labeled in the UI, and are explicitly distinguished from station observations and weather forecasts.
- The current weather panel remains separate and retains its current conditions, wind, humidity, feels-like, daily range, and rain-probability details.

## Acceptance criteria

1. Weather tab displays the viewed month's calendar below current-weather details and before the dashboard disclaimers, with daily high/low and weather condition where available.
2. Past dates use archive reanalysis, near-future dates use up to 16 valid forecast dates, and dates beyond the available forecast data use date-matched 10-year averages.
3. Each calendar day and the month summary clearly distinguish historical, forecast, typical, and unavailable data.
4. Month navigation and city changes request the appropriate coordinates and do not allow stale results to overwrite the current view.
5. Loading, API failures, and missing archive values have clear, accessible UI states.
6. Forecast is not a separate dashboard tab; it is hidden while Air quality is selected.
7. Playwright covers source boundaries, date-matched averages, loading/error handling, city changes, month navigation, and responsive layout with mocked API responses.

## Verification

- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`
- Latest implementation check: all 24 Playwright tests passed; build, lint, and `git diff --check` passed.

Keep the implementation and verified behavior in sync with this skill.
