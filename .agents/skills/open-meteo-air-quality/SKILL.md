---
name: open-meteo-air-quality
description: Guidance for BreatheSafe's live Open-Meteo US AQI and particulate data integration.
---

# Open-Meteo Air Quality

## Approved scope

- Replace illustrative AQI and particulate fixtures with selected-city current air-quality data from Open-Meteo's Air Quality API.
- Display Open-Meteo's US AQI, a category using the US AQI bands, PM2.5, PM10, and the provider model time.
- Request data only for the selected city while its Air quality tab is open; do not poll or request unselected cities.
- This project is intended for non-commercial use and uses Open-Meteo's free public endpoint. Commercial usage requires an appropriate Open-Meteo plan.

## Data and product rules

- Open-Meteo supplies US AQI and European AQI, not CPCB India's AQI. Label the displayed scale as US AQI; never call it Indian/CPCB AQI.
- Use maintained city-center coordinates and India local time (`Asia/Kolkata`).
- Treat current air-quality values as model-based estimates, not local sensor or monitoring-station measurements.
- Validate API responses. Show loading, recoverable error/retry, and model-time states. Never substitute demo AQI when live data fails.
- Abort superseded requests and impose a finite request timeout.
- Display an Open-Meteo attribution link beside the air-quality data and link the CC BY 4.0 licence.
- The free API is non-commercial and has request limits. Follow Open-Meteo's terms and monitor limits if usage grows.

## Acceptance criteria

1. Opening Air quality requests only the selected city's coordinates and renders validated US AQI and particulate data.
2. Changing city or reopening/refreshing Air quality fetches the selected city; stale responses cannot replace its data.
3. Loading, provider/network/invalid-response errors, and retry are understandable and accessible; failures do not show fabricated data.
4. The UI distinguishes US AQI from CPCB India AQI, describes model-based data, and shows attribution and licence links.
5. Playwright covers successful fetch, city selection, request scope, error/retry, invalid responses, attribution, and mobile layout using mocked API responses.

## Verification

- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`

Open-Meteo references:

- Air Quality API: https://open-meteo.com/en/docs/air-quality-api
- Terms and free-tier usage: https://open-meteo.com/en/terms
- Attribution and CC BY 4.0: https://open-meteo.com/en/licence

Keep the implementation, tests, and documented behavior in sync with this skill.
