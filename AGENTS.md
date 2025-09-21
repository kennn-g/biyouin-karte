# Repository Guidelines

## Project Structure & Module Organization
The Next.js 15 app directory lives under `app/`. Route handlers land in `app/api/**` (see `app/api/submit/route.ts` for the Google Sheets bridge) and UI routes stay alongside their `page.tsx` and layout files. Shared styles load from `app/globals.css`, while static assets (logos, icons, favicons) belong in `public/`. TypeScript configuration (`tsconfig.json`) defines the `@/*` path alias that resolves against the repository root; prefer it for cross-module imports. Keep environment secrets in `.env.local`, never committed to git.

## Build, Test, and Development Commands
- `npm run dev` – Launches the Turbopack dev server with hot reload.
- `npm run build` – Creates an optimized production build; run before deployments.
- `npm run start` – Serves the build output locally for smoke testing.
- `npm run lint` – Executes the flat ESLint config (`next/core-web-vitals` + TypeScript rules).

## Coding Style & Naming Conventions
Use TypeScript for all client and server modules. Follow the default Next.js ESLint guidance: two-space indentation, single quotes in TypeScript, and descriptive PascalCase component names. Co-locate route-specific helpers with their `page.tsx`. Favor React hooks over class components, and keep Tailwind utility classes concise and readable.

## Testing Guidelines
Automated tests are not yet wired up; add them under `app/__tests__` or alongside components using the `.test.tsx` suffix. Aim for coverage around form validation and API interactions, and ensure each test suite can run without network access by mocking Google APIs. Always run `npm run lint` before opening a PR to catch type and accessibility regressions.

## Commit & Pull Request Guidelines
Message style follows the existing imperative pattern (e.g., "Fix TypeScript build errors"). Keep commits focused and reference related issues in the body when available. Pull requests should include a short summary, a checklist of manual verifications (`npm run lint`, `npm run build`), and screenshots or recordings for UI updates. Highlight any schema or environment variable changes explicitly.

## Security & Configuration Tips
Provision the Google connection via `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and `SPREADSHEET_ID` in `.env.local`. Never log secrets; rely on Next.js `process.env` access on the server only. When sharing logs, redact spreadsheet IDs and client emails.
