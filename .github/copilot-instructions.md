# BreatheSafe Copilot Instructions

## Project

- This is a React + TypeScript single-page app built with Vite and deployed on Cloudflare Pages. Do not introduce Next.js or a database unless the user approves a feature plan that needs them.
- Follow existing code and dependency patterns. Prefer small, complete changes; preserve unrelated work.
- Use semantic, accessible, responsive UI. Do not present sample or fabricated air-quality/weather values as live data.
- Before adding a data provider, verify the specific dataset/feed license and API terms. Do not imply CPCB, SAMEER, or government endorsement. Keep private credentials out of client code and Git.

## Feature workflow

- For a substantial feature (multiple flows/layers, a significant integration or data model, or several coordinated steps), inspect first, present a concise plan with acceptance criteria, and wait for the user's approval before implementation. Small isolated fixes can proceed directly.
- For approved substantial features, create a focused skill under `.agents/skills/<feature-name>/SKILL.md`, implement the plan, run Playwright end-to-end tests, review the complete change as a principal engineer, and update the feature skill with verified behavior and commands. Follow [BreatheSafe Vibecoding](../.agents/skills/breathesafe-vibecoding/SKILL.md) and [Playwright Testing](../.agents/skills/playwright-testing/SKILL.md) for the detailed workflow.
- Do not add Playwright dependencies or browser setup until a feature needs automated browser tests; explain any setup prerequisites.

## Relevant skills

- Use [Vercel React Best Practices](../.agents/skills/vercel-react-best-practices/SKILL.md) when writing or optimizing React. Apply only guidance relevant to React + Vite; ignore Next.js-specific APIs and assumptions.
- Use [Web Design Guidelines](../.agents/skills/web-design-guidelines/SKILL.md) when asked to review UI, accessibility, or UX.
- Use [Deploy to Cloudflare](../.agents/skills/deploy-to-cloudflare/SKILL.md) when asked to deploy. Do not deploy or push changes without the user's request/approval.

## Checks

- Run `npm run build` and `npm run lint` after application code changes when practical.
- Run focused Playwright tests for substantial features and report commands, results, and any blocked checks accurately.
