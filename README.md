# BreatheSafe

A responsive React and TypeScript dashboard for weather and air quality in major Indian cities. Weather and air-quality data are fetched from Open-Meteo.

## Run locally

```sh
npm install
npm run dev
```

## End-to-end tests

Install the Playwright Chromium browser once after installing dependencies:

```sh
npx playwright install chromium
```

Run the dashboard end-to-end tests:

```sh
npm run test:e2e
```

Playwright starts a local Vite server automatically. Test reports and results are written to `playwright-report/` and `test-results/`, which are excluded from Git.

## Build

```sh
npm run build
```

## Deploy to Cloudflare Pages

1. In Cloudflare, create a Pages project and connect this GitHub repository.
2. Select the React (Vite) framework preset, or configure the build command as `npm run build` and the build output directory as `dist`.
3. Deploy the project. Cloudflare Pages can build subsequent GitHub updates automatically when the repository integration is enabled.

No environment variables or Supabase project are required. Open-Meteo's free API is for non-commercial use; commercial use requires an appropriate plan. The dashboard attributes Open-Meteo data under CC BY 4.0. Air quality is model-based and not a local monitoring-station reading. The displayed AQI uses the US AQI scale and is not CPCB India AQI. Open-Meteo applies request limits to its free API.

See [Open-Meteo Weather](./.agents/skills/open-meteo-weather/SKILL.md) and [Open-Meteo Air Quality](./.agents/skills/open-meteo-air-quality/SKILL.md) for data and product details.
