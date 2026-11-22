---
name: health-advice-smoking-equivalency
description: Guidance for BreatheSafe's cigarette smoking equivalency and dynamic health protection solutions based on Berkeley Earth's PM2.5 formula.
---

# Health Advice & Cigarette Equivalency

## Approved scope

- In the Air Quality tab between the Major air pollutants section and the Historical Air quality chart, render a dedicated **Health impact & advice** card for the selected city.
- Compute cigarette smoking equivalency using the peer-reviewed Berkeley Earth methodology:
  - 1 cigarette/day ≈ 22 µg/m³ of ambient PM2.5.
  - Surface daily, weekly (daily × 7), and monthly (daily × 30) cigarette-equivalent metrics.
- Provide dynamic, actionable solutions based on current AQI / PM2.5 severity:
  - Air Purifier advice (e.g. "Turn On", "Must", "Optional")
  - Mask guidance (e.g. "N95 Mask Essential", "Recommended")
  - Outdoor / Indoor activity guidance (e.g. "Stay Indoor", "Great for walks")
  - Ventilation advice (e.g. "Keep windows closed", "Open windows")
- Provide a **24-Hour Activity & Exposure Outlook** showing safest outdoor exercise windows (e.g. late afternoon mixing) vs peak caution windows (early morning inversion layer) based on atmospheric diurnal cycles.
- Match BreatheSafe's light sage / responsive UI theme with accessible semantic controls.

## Data and product rules

- Calculation uses current model PM2.5 concentration from Open-Meteo.
- Always include clear attribution to Berkeley Earth (Muller & Muller) and an explicit disclaimer that this is a continuous ambient air exposure estimate.
- When AQI changes or user selects another city, recommendations and cigarette counts update dynamically.

## Acceptance criteria

1. Renders cigarette equivalency card between pollutant cards and history chart when Air Quality data is available.
2. Cigarette count correctly calculates $\text{PM2.5} / 22$.
3. Advice updates when viewing cities with different air quality categories.
4. Fully responsive on mobile, tablet, and desktop without horizontal scroll.
5. Unit and E2E tests cover rendering, calculations, and responsive layout.
