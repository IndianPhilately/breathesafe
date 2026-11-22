---
name: metro-cities-aqi-tiles
description: Guidance for BreatheSafe's major Indian metro cities quick comparison AQI tiles under Historical Air Quality.
---

# Metro Cities AQI Comparison Tiles

## Approved scope

- In the Air Quality tab under Historical Air Quality, display a set of quick-comparison tiles for India's major metro cities (Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Ahmedabad, Kolkata, Pune).
- Fetch live model-based US AQI data from Open-Meteo for the featured metro cities concurrently when the Air Quality tab is open.
- Display a direct comparison delta indicator on each tile relative to the currently active city (e.g. "45% cleaner", "+18% higher", or "Viewing" for active city).
- Clicking any tile navigates to that city's Air Quality page, updates the selected city, and smoothly scrolls to top.
- Display corresponding 3D isometric landmark artwork for each featured metro city on its tile and in the top city header.
- Match BreatheSafe's light sage / responsive UI design, accessible focus states, dark text readability, and color-coded AQI values.

## Data and product rules

- Use Open-Meteo Air Quality API `us_aqi` for each metro city via `src/services/openMeteoMetroCities.ts`.
- Featured metro identifiers and helper functions reside in `src/data/metroCities.ts`.
- Optimized WebP landmark illustrations reside under `public/cities/<cityId>.webp`.
- Abort in-flight requests when switching away from the Air quality tab or unmounting.
- Provide clean loading spinners and graceful error fallbacks if a city's AQI request fails.

## Acceptance criteria

1. Metro comparison section appears under the historical air quality chart in the Air Quality tab with 8 clickable metro tiles.
2. 3D landmark illustrations are rendered cleanly in the tiles and conditionally in the top city header for featured metros.
3. Clicking any city tile updates the dashboard city selection and navigates to that city's dashboard.
4. Loading and error states do not disrupt the rest of the dashboard.
5. E2E tests verify rendering, live/mock data retrieval for metro cities, and navigation on tile click.

## Verification

- `npx playwright test -g "displays metro cities quick comparison AQI tiles"`
- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`
