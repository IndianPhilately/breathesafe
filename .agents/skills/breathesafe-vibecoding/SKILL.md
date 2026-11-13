---
name: breathesafe-vibecoding
description: "Build and refine BreatheSafe through plain-language, iterative feature requests. Use when vibecoding, adding or changing React UI, implementing product ideas, or polishing responsive behavior in this React, TypeScript, and Vite project."
argument-hint: "Describe the feature, change, or UI idea you want to build"
user-invocable: true
---

# BreatheSafe Vibecoding

Turn product ideas into small, working changes to the BreatheSafe web app. Work directly in the existing project and keep the user informed at meaningful milestones.

## Project context

- Frontend: React and TypeScript, built with Vite.
- Deploy target: Vercel, with source hosted on GitHub.
- Product direction: responsive air-quality and weather information for India, initially Pune-focused.
- The app may later use CPCB/data.gov.in for air quality, a suitable weather provider, and Supabase if accounts or persistent user data are needed. Do not assume these integrations are configured.

## Workflow

1. **Understand the request.** Read the relevant code and identify the user-visible outcome. Check existing patterns before adding dependencies or abstractions.
2. **Classify the change.** Treat a change as a big feature if it spans multiple user flows or layers, introduces a new integration or substantial data model, or needs several coordinated implementation steps. Small, isolated fixes and polish do not need the big-feature workflow.
3. **Plan big features before coding.** Inspect the relevant code and present a concise plan covering scope, user flows, architecture/data changes, dependencies or service costs, risks, and acceptance criteria. Ask the user to approve or adjust it, and do not begin implementation until they approve. Resolve consequential ambiguity before asking for approval.
4. **Create a feature skill for each big feature.** Before implementation, create `.agents/skills/<feature-name>/SKILL.md` with a matching lowercase kebab-case `name`, meaningful discovery `description`, and the approved scope, domain rules, implementation guidance, and verifiable acceptance criteria. Keep it focused on durable, feature-specific knowledge rather than duplicating this general workflow.
5. **Implement a complete vertical slice.** Follow the approved plan and feature skill. Make the smallest coherent change that works end to end, preserve existing behavior, and avoid unrelated refactors. If implementation requires a material plan change, pause and get the user's approval first.
6. **Design for real use.** Keep layouts responsive from narrow mobile screens through desktop. Use semantic HTML, keyboard-accessible controls, visible focus states, and clear loading, empty, and error states when relevant. Treat the referenced AQI and weather sites as inspiration, not assets or templates to copy.
7. **Handle data responsibly.** Do not invent live readings or present mock values as real. Clearly label sample data. Before adding an external data source, verify the specific dataset/feed license and API terms; do not imply CPCB, SAMEER, or government endorsement. Keep private API credentials out of browser code and Git; use a server-side Vercel function or another appropriate backend when a provider requires a secret.
8. **Keep the stack lean.** Prefer existing React, TypeScript, CSS, and project utilities. Add a package only when the feature needs it, and explain material cost or service requirements before introducing paid or account-dependent services.
9. **Automate feature tests with Playwright.** For a big feature, add or extend Playwright end-to-end tests for its important acceptance criteria and run them after implementation. Follow [Playwright Testing](../playwright-testing/SKILL.md) for test conventions. Check the primary user flow, meaningful edge/error states, and responsive behavior where relevant. Reuse the repository's existing Playwright setup; if none exists, add the smallest appropriate setup and document any browser installation or environment prerequisites. Do not claim a test passed unless it was actually run; report blocked tests and the reason.
10. **Review as a principal engineer.** After tests, review the complete feature diff for correctness, edge cases, security and privacy, accessibility, performance, maintainability, observability/error handling, and regressions. Fix material findings and rerun affected checks. Do not approve the implementation solely because it builds or its happy-path test passes.
11. **Keep skills in sync.** After the feature is developed and reviewed, update its feature skill with the actual architecture, decisions, commands, and verified acceptance criteria. Update this BreatheSafe skill only when the general workflow or project-wide conventions changed. Keep both accurate; avoid copying feature-specific implementation details into this general skill.
12. **Summarize clearly.** Report what changed, the plan/approval and skills created or updated, Playwright and other verification results, review findings addressed or remaining, and any setup such as provider keys, Supabase configuration, or Vercel environment variables. Do not claim a deployment or external integration is complete unless it was actually performed and verified.

## Working style

- For small changes, treat a short feature description as permission to implement it, not just return a plan. For big features, stop for the user's plan approval before coding.
- Prefer a polished, usable result over placeholder controls; do not leave buttons that appear functional but do nothing.
- Preserve the current visual direction unless asked to redesign it.
- If a request cannot be completed without credentials, account access, or a product decision, complete any safe work that does not depend on it and identify exactly what is needed next.
