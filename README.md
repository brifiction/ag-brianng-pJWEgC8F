# AutoGrab — Vehicle Selection Form

A React form for picking a vehicle (Make → Model → Badge) and uploading its service logbook as plain text or JSON. Backed by an Express API.

- Requirements, business rules and acceptance criteria: [docs/requirements.md](docs/requirements.md)
- Sample logbook: [samples/logbook.json](samples/logbook.json) (format in [docs/requirements.md](docs/requirements.md#logbook-json-format))

## Prerequisites

- Node.js 24 or later (`nvm use`)
- pnpm 11 (`corepack enable`)

## Getting started

```sh
pnpm install
pnpm dev
```

- Web: http://localhost:5173 (proxies `/api` to the API)
- API: http://localhost:4000

### Try it

1. Open http://localhost:5173.
2. Click **Ford Ranger Raptor**, or choose a Make, Model and Badge.
3. Upload [samples/logbook.json](samples/logbook.json), or any `.txt` file.
4. Click **Submit**. The vehicle and logbook come back from the API and are shown below the form.

## Project structure

```
apps/
  web/                         React app (Vite)
    src/App.tsx                Page layout; loads the vehicle catalogue
    src/features/vehicle-logbook/
      VehicleLogbookForm.tsx   The form: dropdown cascade, quick select, upload, submit
      VehicleSelect.tsx        One labelled dropdown
      LogbookField.tsx         The logbook file input
      QuickSelect.tsx          Preset vehicle buttons
      SubmissionResult.tsx     What the API sent back
      catalogue.ts             Catalogue lookups and display labels
      logbook-file.ts          Checks a chosen file with the shared logbook rules
      api.ts                   API client (axios)
  api/                         Express API
    src/app.ts                 Routes and error handling
    src/logbooks.ts            POST /api/logbooks
    src/catalogue.ts           Vehicle data and validation
    src/errors.ts              JSON error responses
    src/data/vehicles.json     The vehicle data from the brief
packages/
  files/logbook/               Logbook file rules shared by web and API
docs/requirements.md           Business rules, user stories, acceptance criteria, API contract
samples/                       Sample logbook
```

Tests sit next to the code they cover (`*.test.ts`, `*.test.tsx`) and are named after the acceptance criteria in the requirements, for example `AC-04.1`.

## How it works

1. The form loads the catalogue from `GET /api/vehicles`, so the API is the single source of vehicle data.
2. Picking a Make loads its Models; picking a Model loads its Badges. Changing any part of the vehicle clears the parts after it and the attached logbook.
3. The chosen file is checked in the browser with the shared logbook rules: `.txt` or `.json`, UTF-8, 1 MB or smaller, and JSON must match the logbook format.
4. Submit sends `multipart/form-data` to `POST /api/logbooks`. The API checks the vehicle against the catalogue and the file against the same shared rules, reads the upload with `node:fs`, deletes it, and returns the vehicle and logbook.
5. Errors come back as `{ error: { code, message, field } }`; the codes are listed in [the API contract](docs/requirements.md#7-api-contract).

## Stack

| Workspace                | Purpose and tech                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `apps/web`               | Vehicle form: React 19, Vite, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), react-hook-form, axios |
| `apps/api`               | API: Express 5, TypeScript (run natively by Node), multer, `node:fs`                                |
| `packages/files/logbook` | Logbook file rules (formats, size, UTF-8, JSON format) shared by the web app and API                |
| Tooling                  | pnpm workspaces, Turborepo, Biome (lint + format), ESLint (SonarJS + TypeDoc), Vitest, axe-core     |

## Scripts

| Command          | Purpose                           |
| ---------------- | --------------------------------- |
| `pnpm dev`       | Run web and API in watch mode     |
| `pnpm build`     | Build the web app                 |
| `pnpm typecheck` | Type-check every workspace        |
| `pnpm test`      | Run unit and accessibility tests  |
| `pnpm lint`      | Biome, SonarJS and TypeDoc checks |
| `pnpm lint:fix`  | Auto-fix lint issues and format   |
| `pnpm format`    | Format with Biome                 |

Production API: `pnpm --filter @autograb/api start`. Node runs the TypeScript source directly, so the API has no build step.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to `main` and every pull request:

- **Checks:** `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`.
- **Snyk scan:** dependencies (`snyk test`) and source code (`snyk code test`). It fails on high or critical issues.

The Snyk scan needs a `SNYK_TOKEN` repository secret (Settings → Secrets and variables → Actions). To scan locally, copy `.env.example` to `.env`, add your token, then run:

```sh
set -a; . ./.env; set +a
npx snyk@1.1308.1 test --all-projects --severity-threshold=high
npx snyk@1.1308.1 code test --severity-threshold=high
```

## Conventions

- `apps/web/src/components/ui` is generated by shadcn (`pnpm dlx shadcn@4.22.0 add <component>` from `apps/web`). It is formatted, but excluded from linting.
- Every function has a TypeDoc comment (summary, `@param`, `@returns`), checked by `pnpm lint`.
- pnpm only installs releases at least 14 days old (`minimumReleaseAge` in `pnpm-workspace.yaml`).
