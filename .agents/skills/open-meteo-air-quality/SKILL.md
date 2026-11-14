---
name: open-meteo-air-quality
description: Guidance for BreatheSafe's live Open-Meteo US AQI and pollutant data integration.
---

# Open-Meteo Air Quality

## Approved scope

- Replace illustrative AQI and particulate fixtures with selected-city current air-quality data from Open-Meteo's Air Quality API.
- Display Open-Meteo's US AQI, a category using the US AQI bands, PM2.5, PM10, carbon monoxide, nitrogen dioxide, sulphur dioxide, ozone, and the provider model time.
- Show an AQI/PM2.5/PM10 history chart beneath the pollutant cards, with 25-hour, 7-day, 30-day, and 3-month ranges plus bar/line modes.
- Open the dashboard on the Air quality tab by default.
- Request data only for the selected city while its Air quality tab is open; do not poll or request unselected cities.
- This project is intended for non-commercial use and uses Open-Meteo's free public endpoint. Commercial usage requires an appropriate Open-Meteo plan.

## Data and product rules

- Open-Meteo supplies US AQI and European AQI, not CPCB India's AQI. Label the displayed scale as US AQI; never call it Indian/CPCB AQI.
- Use maintained city-center coordinates and India local time (`Asia/Kolkata`).
- Treat current air-quality values as model-based estimates, not local sensor or monitoring-station measurements.
- The India CAMS Global history series is 3-hourly and the public endpoint permits up to 92 past days. Use actual samples for 25 hours, daily peaks for 7 days through 3 months, and keep 1-year/10-year ranges disabled with an availability explanation.
- Do not interpolate missing history values or render them as zero; omit unavailable measures and show a clear empty state when a selected range has no values.
- Display pollutant concentrations in Open-Meteo's supplied `μg/m³` units; do not relabel or convert gas values to `ppb`.
- Validate API responses. Show loading, recoverable error/retry, and model-time states. Never substitute demo AQI when live data fails.
- Show the model time beside the AQI score. Provide an accessible category explanation from the official AirNow AQI Basics descriptions, with a source link; do not invent health advice.
- Abort superseded requests and impose a finite request timeout.
- Display an Open-Meteo attribution link beside the air-quality data and link the CC BY 4.0 licence.
- The free API is non-commercial and has request limits. Follow Open-Meteo's terms and monitor limits if usage grows.

## Acceptance criteria

1. The dashboard opens on Air quality, requests only the selected city's coordinates, and renders validated US AQI plus PM2.5, PM10, carbon monoxide, nitrogen dioxide, sulphur dioxide, and ozone.
2. Changing city or reopening/refreshing Air quality fetches the selected city; stale responses cannot replace its data.
3. Loading, provider/network/invalid-response errors, and retry are understandable and accessible; failures do not show fabricated data.
4. The UI distinguishes US AQI from CPCB India AQI, describes model-based data, and shows attribution and licence links.
5. Playwright covers successful pollutant fetch and display, city selection, request scope, error/retry, invalid responses, attribution, and the six-card desktop/tablet/mobile layout using mocked API responses.
6. All six US AQI categories show their matching AirNow description in a keyboard-accessible disclosure linked to the source, and the model time appears beside the AQI score.
7. The history chart uses validated selected-city data, supports all available measures/ranges and bar/line modes, and shows accessible loading, error/retry, and empty states.
8. Playwright covers chart range aggregation, unavailable long ranges, metric/style selection, history request scope, error recovery, and mobile overflow.

## Verification

- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`

Open-Meteo references:

- Air Quality API: https://open-meteo.com/en/docs/air-quality-api
- Terms and free-tier usage: https://open-meteo.com/en/terms
- Attribution and CC BY 4.0: https://open-meteo.com/en/licence

Keep the implementation, tests, and documented behavior in sync with this skill.
