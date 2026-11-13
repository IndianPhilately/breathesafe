---
name: open-meteo-weather
description: Guidance for BreatheSafe's non-commercial Open-Meteo current weather integration.
---

# Open-Meteo Weather

## Approved scope

- Replace sample weather for the 10 supported Indian cities with selected-city current weather.
- Fetch temperature, relative humidity, WMO weather code, wind speed and direction, apparent temperature, hourly precipitation probability, and daily high/low from Open-Meteo's Forecast API.
- Fetch on initial load, city selection, and explicit manual refresh; do not poll or request unselected cities.
- Monthly historical, forecast, and typical-weather calendar behavior is documented in `.agents/skills/monthly-weather-calendar/SKILL.md`.
- Keep AQI implementation guidance in `.agents/skills/open-meteo-air-quality/SKILL.md`.
- This project is intended for non-commercial use and uses Open-Meteo's free public endpoint. Commercial usage requires an appropriate Open-Meteo plan and customer endpoint.

## Data and product rules

- Use the maintained city-center coordinates; request India local time (`Asia/Kolkata`), Celsius, and km/h.
- Treat provider observations as model-based current conditions, not local sensor readings.
- Validate API responses. Show loading, recoverable error/retry, and update-time states. Never substitute demo weather when live data fails.
- Abort superseded requests so an older city response cannot replace the selected city's weather.
- Display a visible link to `https://open-meteo.com/` alongside weather data using the credit “Weather data by Open-Meteo.com”.
- Do not describe weather estimates as local station measurements; keep weather attribution near the data.

## Acceptance criteria

1. Initial load and selecting a supported city requests only that city's coordinates and renders validated current weather, feels-like temperature, matching-hour rain probability, and local-day high/low.
2. Manual refresh requests the selected city again; outdated requests cannot overwrite newer selection data.
3. Loading, provider/network/invalid-response errors, and retry are understandable and accessible; failures do not show fabricated weather.
4. Open-Meteo weather credit is linked on the weather panel.
5. Playwright covers successful fetch, forecast details, city change, stale-request cancellation, refresh, loading/error/retry, invalid current and forecast responses, attribution, and mobile layout using mocked API responses.

## Verification

- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`

Open-Meteo references:

- Forecast API: https://open-meteo.com/en/docs
- Terms and free-tier usage: https://open-meteo.com/en/pricing
- Attribution and CC BY 4.0: https://open-meteo.com/en/licence

Keep the implementation, tests, and documented behavior in sync with this skill.
