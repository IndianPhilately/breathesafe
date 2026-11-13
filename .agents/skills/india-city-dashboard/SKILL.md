---
name: india-city-dashboard
description: Guidance for BreatheSafe's India city selector and live Open-Meteo weather and AQI dashboard.
---

# India City Dashboard

## Approved scope

- Support the 339 Indian city entries above 100,000 listed in Wikipedia's “List of cities in India by population” table in `src/data/cities.ts`, with its 2011 Census population values and listed coordinates.
- Let users search and select a city with the accessible city picker, or explicitly request device location to select the nearest supported city. Pune remains the fallback when location is not requested or unavailable.
- Never request device location automatically or persist precise device coordinates.
- Display the selected city's clearly dated 2011 Census population and population figures in search results. Attribute the adapted data to Wikipedia contributors and link its CC BY-SA 4.0 licence; do not imply the population is current.
- Let users switch between Weather and AQI views.
- Weather fields come from the selected city's Open-Meteo current conditions: temperature, condition, relative humidity, wind speed, and direction.
- Air-quality fields come from the selected city's Open-Meteo Air Quality API: US AQI, US AQI category, PM2.5, and PM10.
- Both weather and air-quality values are model-based. The US AQI is not CPCB India AQI or a local monitoring-station reading.
- Keep city and coordinates in typed local fixtures. Do not add persistence, credentials, or Supabase for this feature.

## Domain and implementation guidance

- A supported location is a city, never a neighborhood or locality.
- Keep an air-quality limitation notice visible regardless of selected city or tab. Explicitly identify the US AQI scale and do not claim that it represents CPCB or SAMEER data.
- Open-Meteo weather and air quality are model-based and should not be described as local sensor observations. Keep attribution next to the displayed data; follow `.agents/skills/open-meteo-weather/SKILL.md` and `.agents/skills/open-meteo-air-quality/SKILL.md`.
- Use semantic, keyboard-operable controls and expose the selected tab state accessibly.
- Keep city searching local; device coordinates are used only to find the nearest supported city's maintained coordinates.
- Explain location permission failures without changing the selected city.
- Keep the dashboard responsive and use BreatheSafe branding; reference dashboards are inspiration, not templates to copy.
- Fetch air quality only for the selected city while its tab is open. Do not poll.
- Do not add additional live data providers until their terms, attribution, and any server-side credential needs are reviewed.

## Acceptance criteria

1. Searching for and selecting any supported city updates the displayed city/state and fetched data.
2. Weather and AQI controls switch between distinct, labeled panels and expose their selected state.
3. Air quality is clearly labeled as model-based US AQI, not CPCB India AQI or a local monitoring-station reading.
4. The dashboard is usable on mobile and desktop without horizontal overflow.
5. Device location is requested only after activation; success selects the nearest supported city and errors preserve the current selection.
6. Playwright covers the 339-entry population-threshold fixture, city search/population display, location outcomes, tab switching/data notices, keyboard behavior, and responsive rendering.

## Verification

- One-time browser setup: `npx playwright install chromium`
- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`

Keep the commands and behavior above in sync with the implemented feature and the verified test setup.
