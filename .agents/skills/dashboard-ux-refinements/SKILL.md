---
name: dashboard-ux-refinements
description: Guidance for clarifying BreatheSafe AQI freshness, category meaning, city details, and weather-calendar data.
---

# Dashboard UX Refinements

## Scope

- Keep the selected city's AQI and current conditions primary.
- Display the AQI model time beside the US AQI score.
- Explain the meaning of each US AQI category with concise AirNow/EPA text in an accessible disclosure.
- Avoid repeating model-estimate labels on every pollutant card when the section is already identified as model-based.
- Keep Census population data available, but secondary to current conditions and explicitly label its year.
- Call the monthly view a weather calendar because it combines historical reanalysis, forecast, and typical values.

## Data and copy rules

- Label the index as US AQI; do not call it CPCB India AQI or a local monitoring-station reading.
- Do not invent health advice. Use category descriptions from the official AirNow AQI Basics page and link to that source.
- Keep the Census year visible wherever the population figure is shown.
- Do not present typical conditions or historical reanalysis as forecast data.

## Acceptance criteria

1. The selected city's AQI model time is adjacent to the current score and appears only once.
2. The pollutant section retains clear model-data context without repeating the same phrase on every card.
3. The category explanation matches the selected category, is keyboard-accessible, and links to AirNow AQI Basics.
4. The Census population is accessible through a collapsed city-details disclosure and remains labeled with its source year.
5. The weather panel is labeled as a 30-day calendar, not a 30-day forecast.
6. Playwright covers category guidance, timestamp placement, disclosure behavior, calendar naming, and responsive layout.

## Implemented behavior

- The AQI score block contains the model time; the lower attribution row retains only source, licence, and refresh controls.
- The AQI overview includes a collapsed native disclosure with one of six AirNow category descriptions and a link to AQI Basics.
- Pollutant cards show the pollutant name and concentration without repeating the model-estimate label.
- Census population appears inside a collapsed City information disclosure with the 2011 year explicit.
- The monthly view title uses “30-day weather calendar” to reflect its historical, forecast, and typical data sources.

## Verification

- `npm.cmd run test:e2e` — 27 passed.
- `npm.cmd run build` — passed.
- `npm.cmd run lint` — passed.

Official category descriptions: https://www.airnow.gov/aqi/aqi-basics/
