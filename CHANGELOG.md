# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Every function has a TypeDoc comment: a summary, `@param` for each parameter and `@returns`. ESLint checks it with the standard `eslint-plugin-jsdoc` preset and `eslint-plugin-tsdoc`.
- Logbook file rules live in a shared package (`packages/files/logbook`), so the web app and API apply the same checks.
- Lint and Turborepo config list only non-default settings; Biome fails on any recommended-rule warning.

## [0.2.0] - 2026-10-31

### Added

- Logbook file validation for plain text and JSON (UTF-8, 1 MB max), with each JSON entry checked against the logbook format.
- Catalogue helpers and API client for vehicles and logbook uploads.
- Vehicle form with cascading Make → Model → Badge dropdowns, quick-select presets, logbook upload, submission result (JSON logbooks as a table) and reset.

## [0.1.0] - 2026-10-31

### Added

- Requirements, business rules and acceptance criteria (`docs/requirements.md`).
- README with setup and run instructions.
- Sample JSON service logbook (`samples/logbook.json`).
- pnpm workspace with Turborepo `dev`, `build`, `typecheck` and `test` tasks.
- Minimum release age of 14 days for all dependencies.
- Biome formatting and linting, including all accessibility rules, with SonarJS rules run through ESLint.
- Express API with `GET /api/health` and `GET /api/vehicles`.
- React web app with Vite, Tailwind CSS and shadcn/ui.
- Vitest with Testing Library and axe-core accessibility checks (`pnpm test`).
- shadcn/ui form components: select, field, input, label, card, alert and spinner.
