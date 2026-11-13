# BreatheSafe

A responsive React and TypeScript dashboard for weather and air quality in major Indian cities. The current dashboard uses illustrative sample values and is not connected to a live data source.

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

## Deploy to Vercel

1. Push this project to a GitHub repository.
2. In Vercel, import that repository and deploy it.
3. Vercel can detect the Vite setup automatically. The build command is `npm run build`, and the output directory is `dist`.

No environment variables or Supabase project are needed for this demo dashboard. Its weather and AQI values are not live readings.
