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
2. The pollutant section retains clear model-data context without repeating the same phrase on every card. Model-based data limitations are cleanly stated in the page footer and illustration subtext rather than a cluttered top banner.
3. The category explanation matches the selected category, is keyboard-accessible, and links to AirNow AQI Basics.
4. The Census population is displayed directly under the city name as a clean one-liner labeled with its source year, with no disclosure/chevron clutter.
5. The weather panel is labeled as a 30-day calendar, not a 30-day forecast.
6. Playwright covers category guidance, timestamp placement, calendar naming, and responsive layout.

## Implemented behavior

- The AQI score block contains the model time; the lower attribution row retains only source, licence, and refresh controls.
- The AQI overview includes a collapsed native disclosure with one of six AirNow category descriptions and a link to AQI Basics.
- Pollutant cards show the pollutant name and concentration without repeating the model-estimate label.
- Census population appears directly under the city name as a clean one-liner with the 2011 year explicit.
- Model-based limitations are stated in the footer note and illustration badge, eliminating redundant top banners.
- Duplicate labels are eliminated: removed redundant "United States AQI scale" subtext under the AQI badge and repeated city name under the weather condition.
- The monthly view title uses “30-day weather calendar” to reflect its historical, forecast, and typical data sources.
- Layout padding is streamlined: gap between tabs and hero kicker is tightened from 46px to 18px, and hero illustration uses explicit dimensions (`width="208" height="178"`) eliminating Cumulative Layout Shift (CLS).
- Text and badge contrast across all components meets or exceeds WCAG AA 4.5:1 ratio.

## Verification

- `npm.cmd run test:e2e` — 38 passed.
- `npm.cmd run build` — passed.
- `npm.cmd run lint` — passed.

Official category descriptions: https://www.airnow.gov/aqi/aqi-basics/
