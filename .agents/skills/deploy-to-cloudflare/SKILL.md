---
name: deploy-to-cloudflare
description: Guidance for deploying BreatheSafe's Vite application to Cloudflare Pages.
---

# Deploy to Cloudflare Pages

Use this guidance when asked to deploy BreatheSafe or configure its Cloudflare Pages project.

## Project build settings

- Framework preset: React (Vite)
- Build command: `npm run build`
- Build output directory: `dist`
- The GitHub repository is the source of truth; connect it to Pages for Git-based builds.
- This static frontend does not currently require environment variables, Supabase, or a server-side runtime.

## Deployment workflow

1. Confirm the Cloudflare account/project and target environment before changing deployment settings.
2. Verify the current branch and worktree before deployment; do not discard or commit unrelated user changes.
3. For a first setup, connect the GitHub repository to a Cloudflare Pages project and use the build settings above.
4. For an existing Pages project, verify the selected repository, production branch, and build settings before deployment.
5. After deployment, report the deployment URL and verify the deployed page and critical dashboard flow. Do not claim deployment succeeded unless it was checked.
6. Never expose provider credentials in client code. If a future provider requires a secret, use an appropriate server-side Cloudflare service and keep secrets in managed environment bindings.

## References

- Cloudflare Pages build configuration: https://developers.cloudflare.com/pages/configuration/build-configuration/
- Cloudflare Pages Git integration: https://developers.cloudflare.com/pages/get-started/git-integration/
