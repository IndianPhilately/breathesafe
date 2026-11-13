---
name: india-city-dashboard
description: Guidance for BreatheSafe's India city selector and demo-only weather and AQI dashboard.
---

# India City Dashboard

## Approved scope

- Support Ahmedabad, Bengaluru, Chennai, Delhi, Hyderabad, Jaipur, Kolkata, Lucknow, Mumbai, and Pune. Show city and state, with Pune selected initially.
- Let users select a city and switch between Weather and AQI views.
- Weather demo fields: temperature, condition, humidity, and wind.
- AQI demo fields: AQI value, India-scale category, and PM2.5/PM10 sample details.
- Clearly show that readings are illustrative demo data, not live measurements.
- Keep city and demo readings in typed local fixtures. Do not fetch external services or add persistence, credentials, or Supabase for this feature.

## Domain and implementation guidance

- A supported location is a city, never a neighborhood or locality.
- Keep the sample-data notice visible regardless of selected city or tab. Avoid claims that demo readings are current or sourced from CPCB, SAMEER, or another provider.
- Use semantic, keyboard-operable controls and expose the selected tab state accessibly.
- Keep the dashboard responsive and use BreatheSafe branding; reference dashboards are inspiration, not templates to copy.
- Do not add a live data provider until its terms, attribution, and any server-side credential needs are reviewed.

## Acceptance criteria

1. Selecting any supported city updates the displayed city/state and its demo data.
2. Weather and AQI controls switch between distinct, labeled panels and expose their selected state.
3. The persistent notice identifies readings as demo data and not live.
4. The dashboard is usable on mobile and desktop without horizontal overflow.
5. Playwright covers city selection, tab switching/disclaimer, keyboard behavior, and responsive rendering.

## Verification

- One-time browser setup: `npx playwright install chromium`
- `npm.cmd run test:e2e`
- `npm.cmd run build`
- `npm.cmd run lint`

Keep the commands and behavior above in sync with the implemented feature and the verified test setup.
