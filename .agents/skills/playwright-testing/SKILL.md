---
name: playwright-testing
description: "Create, run, and maintain reliable Playwright Test end-to-end and browser regression tests for BreatheSafe. Use when adding or debugging Playwright tests, validating feature flows, or setting up browser automation in this React and Vite project."
argument-hint: "Describe the user flow or browser behavior to test"
user-invocable: true
---

# BreatheSafe Playwright Testing

Use Playwright Test to verify BreatheSafe behavior through real browser interactions. This skill covers the committed automated regression suite; it is separate from the Microsoft Playwright CLI skill for exploratory browser control.

## Project context

- The app uses React, TypeScript, and Vite.
- Reuse the repository's existing Playwright configuration, scripts, fixtures, and conventions when present.
- If Playwright Test is not configured, follow the approved feature plan and the BreatheSafe vibecoding skill before adding dependencies or browser setup. Record the install, run, and browser-install commands in the project documentation.
- Tests should run against a local or controlled preview instance, not production.

## Test workflow

1. Read the feature's skill, approved plan, acceptance criteria, application code, and existing tests before writing new tests.
2. Select tests that verify important user-visible acceptance criteria: the main flow, relevant validation or error behavior, and responsive or keyboard behavior where applicable. Keep the suite focused and avoid redundant tests.
3. Use isolated tests. Each test must be runnable independently and must not depend on execution order, leaked browser storage, or mutable shared state.
4. Prefer accessible, user-facing locators such as `getByRole`, `getByLabel`, and `getByText`. Use a stable `data-testid` only when there is no suitable user-facing contract. Avoid brittle CSS, XPath, generated class names, and selectors coupled to component internals.
5. Rely on Playwright locator auto-waiting and web-first assertions such as `await expect(locator).toBeVisible()`. Do not add fixed sleeps or arbitrary timeouts to mask synchronization problems.
6. Make tests deterministic. Mock or intercept external AQI, weather, geolocation, and other third-party requests when those responses are not the behavior under test. Use explicit fixtures and label test data; never treat mock readings as live data. Do not call real production services or mutate production accounts/data.
7. Prefer assertions against rendered output and user-observable behavior over implementation details. Keep test setup and fixtures small, typed, and reusable only when reuse improves clarity.
8. Include responsive coverage at meaningful breakpoints for features whose layout or interaction changes by viewport. Check keyboard interaction and accessible names for interactive controls where relevant.
9. **Test execution strategy (Fast feedback vs. Full suite):**
   - **During active development / iterative changes:** Run only the focused test matching the affected feature area (e.g. `npx playwright test -g "<feature-keyword>"`). Also run quick build and lint checks (`npm run build && npm run lint`).
   - **Before commit / final verification:** Run the full E2E test suite (`npm run test:e2e`) to guarantee zero regressions across the whole app.
   - Report the exact commands and results. If a browser, environment variable, or service prevents execution, report it as blocked; do not describe an unrun test as passing.
10. Inspect failures and fix root causes rather than weakening assertions. Retain the configured trace, screenshot, or video artifacts on failure and use them to diagnose issues. Do not add generated test artifacts to Git unless the project intentionally versions them.
11. Review the tests for determinism, coverage of the approved criteria, accessibility, and maintainability. Update the feature-specific skill with verified test commands and behavior when the feature is complete.

## Official reference

Follow current Playwright guidance for [best practices](https://playwright.dev/docs/best-practices), [locators](https://playwright.dev/docs/locators), and [assertions](https://playwright.dev/docs/test-assertions).
