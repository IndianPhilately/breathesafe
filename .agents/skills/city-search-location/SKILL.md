---
name: city-search-location
description: Guidance for BreatheSafe's searchable India city picker and opt-in device location selection.
---

# City Search and Device Location

## Approved scope

- Replace the native city select with a searchable, keyboard-operable city picker inspired by the supplied reference.
- Support deep URL query routing and bookmarking (`?city=...&tab=...`), synchronizing with browser history (`pushState` / `popstate`) and updating document titles dynamically.
- Support the 339 Indian city entries in Wikipedia's “List of cities in India by population” table above 100,000, using the listed 2011 population values and coordinates. Use Delhi as the initial city.
- Offer an explicit device-location action. Do not request location automatically or persist precise device coordinates.
- Resolve device coordinates to the nearest supported city and continue using that city's maintained coordinates for existing Open-Meteo weather and air-quality requests.
- Keep Delhi as the fallback city when location is not requested or unavailable.

## Domain and implementation guidance

- Search city and state names locally, case-insensitively, with common-name aliases; present up to eight alphabetically sorted matches and show each result's 2011 population.
- Attribute the adapted city list and population data to Wikipedia contributors and link the CC BY-SA 4.0 licence.
- Use semantic combobox/listbox behavior, visible focus states, and keyboard navigation. Clearly expose loading and permission/error states for geolocation.
- Device location is optional and requires a user action. A denied or unavailable location must leave the current selection unchanged.
- Do not display sample weather or temperatures in city-search results.
- Keep the dashboard's existing data attribution and US AQI limitations visible and accurate.

## Implemented behavior

- City names, states, aliases, 2011 populations, and coordinates live in `src/data/cities.ts`, adapted from the article's list above 100,000 population.
- The list is a static snapshot; its population values are from Census 2011 and should not be presented as current estimates.
- `findNearestCity` uses Haversine distance to select the closest supported city to device coordinates. Only the resulting city is kept in application state; raw coordinates are not persisted.
- The search input starts empty with a placeholder, shows suggestions after three characters, and clears after selection while the dashboard retains the selected city. It supports arrow/enter/escape interactions and displays results in the reference-inspired dark dropdown. The dashboard shows the selected city's 2011 population; results link the source article and CC BY-SA 4.0 licence.
- A newer manual search/selection invalidates a pending location result so it cannot override the user's later choice.
- Verified with `npm.cmd run build`, `npm.cmd run lint`, and the Playwright e2e suite.

## Acceptance criteria

1. Users can filter the supported city list, select a result with pointer or keyboard, and see the dashboard update for that city's existing coordinates.
2. The picker remains usable at narrow mobile widths without horizontal overflow.
3. The device-location control requests geolocation only after activation, selects the nearest supported city on success, and presents an understandable error without changing the selection on failure.
4. No precise device coordinates are stored.
5. Playwright verifies the 339-entry fixture meets the 100,000 threshold and has valid unique ids/coordinates; it also covers search, population attribution, keyboard selection, geolocation success and failure, and responsive rendering.

## Verification

- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`

Keep the implementation and verified behavior in sync with this skill.
