# Vehicle Selection Form — Requirements

|                  |                                                                              |
| ---------------- | ---------------------------------------------------------------------------- |
| **Product**      | Vehicle Selection Form (AutoGrab take-home)                                  |
| **Source**       | _AutoGrab – Vehicle Selection Form.pdf_ (Senior Software Engineer challenge) |
| **Status**       | Draft v0.1 — for review                                                      |
| **Last updated** | 2026-10-31                                                                   |

---

## 1. Purpose

Let a user identify a vehicle by **Make → Model → Badge**, attach that vehicle's **service logbook** as a plain-text (`.txt`) or JSON (`.json`) file, and submit both to a Node.js service. The service returns the confirmed vehicle and logbook contents, which are then shown on the page.

## 2. Scope

### In scope

- Three dependent dropdowns: Make, Model, Badge.
- Clearing and reloading dependent selections when an upstream choice changes.
- At least two quick-select buttons for common vehicles.
- Uploading one logbook file, plain text or JSON, once a Badge is selected.
- POSTing the form to an Express API and showing the response on the page.
- A README with run instructions.

### Out of scope

- Authentication, user accounts, persistence of submissions beyond the request.
- Editing or managing the vehicle catalogue (it is static, hard-coded data).
- File formats other than plain text and JSON (PDF, images, `.docx`).
- Creating, editing or deleting logbook entries in the UI. The JSON format (section 4) is designed so this can be added later.
- Visual design polish ("function over polish").

## 3. Glossary

| Term                    | Definition                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| **Make**                | Manufacturer, e.g. Ford, BMW, Tesla. Top level of the catalogue.                                   |
| **Model**               | Vehicle line within a Make, e.g. Ranger.                                                           |
| **Badge**               | Variant or trim within a Model, e.g. Raptor X.                                                     |
| **Vehicle**             | A valid Make + Model + Badge combination from the catalogue.                                       |
| **Catalogue**           | The static Make → Model → Badge[] map supplied in the brief.                                       |
| **Logbook**             | The vehicle's service history, uploaded as a plain-text (`.txt`) or JSON (`.json`) file.           |
| **Logbook entry**       | One service record in a JSON logbook: date, odometer reading, description and optional workshop.   |
| **Quick-select**        | A button that pre-fills Make, Model and Badge with one preset vehicle.                             |
| **Dependent selection** | A field whose options depend on an upstream field (Model depends on Make; Badge depends on Model). |

## 4. Reference data

Source: brief, "Vehicle Data". Stored in `apps/api/src/data/vehicles.json`.

| Make (key) | Model      | Badges                              |
| ---------- | ---------- | ----------------------------------- |
| ford       | Ranger     | Raptor, Raptor X, Wildtrak          |
| ford       | Falcon     | XR6, XR6 Turbo, XR8                 |
| ford       | Falcon Ute | XR6, XR6 Turbo                      |
| bmw        | 130d       | xDrive 26d, xDrive 30d              |
| bmw        | 240i       | xDrive 30d, xDrive 50d              |
| bmw        | 320e       | xDrive 75d, xDrive 80d, xDrive 85d  |
| tesla      | Model 3    | Performance, Long Range, Dual Motor |

Note that badge names repeat across models and makes (`XR6` under Falcon and Falcon Ute; `xDrive 30d` under 130d and 240i). A badge is only unique **within its Model** (see BR-02).

### Logbook JSON format

A JSON logbook is an object with an `entries` array. Sample: `samples/logbook.json`.

```json
{
  "entries": [
    {
      "date": "2024-03-12",
      "odometerKm": 15020,
      "description": "Scheduled service #1: oil and filter, tyre rotation",
      "workshop": "Brisbane Ford"
    }
  ]
}
```

| Field                   | Type   | Rule                                          |
| ----------------------- | ------ | --------------------------------------------- |
| `entries`               | array  | Required. At least one entry.                 |
| `entries[].date`        | string | Required. A real calendar date, `YYYY-MM-DD`. |
| `entries[].odometerKm`  | number | Required. A whole number, 0 or more.          |
| `entries[].description` | string | Required. Not blank.                          |
| `entries[].workshop`    | string | Optional. Not blank when present.             |

Unknown fields are ignored. Entries are kept in file order.

## 5. Business rules

| ID        | Rule                                                                                                                                                                                 | Source                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| **BR-01** | A vehicle is identified by exactly one Make, one Model and one Badge.                                                                                                                | Brief, The Task                                          |
| **BR-02** | A Make + Model + Badge combination is valid only if it exists in the catalogue. Badge names are unique within a Model, not globally.                                                 | Vehicle Data                                             |
| **BR-03** | Make options are every Make key in the catalogue. Makes are shown with display labels (`ford` → "Ford", `bmw` → "BMW", `tesla` → "Tesla"). The key is the value that gets submitted. | Vehicle Data; _assumption A-01_                          |
| **BR-04** | Model options are only the Models of the selected Make. Model is unavailable until a Make is selected.                                                                               | Brief, The Task                                          |
| **BR-05** | Badge options are only the Badges of the selected Model. Badge is unavailable until a Model is selected.                                                                             | Brief, The Task                                          |
| **BR-06** | Changing the **Make** clears the Model and Badge and loads the Models for the new Make.                                                                                              | Brief, The Task                                          |
| **BR-07** | Changing the **Model** clears the Badge and loads the Badges for the new Model. The Make is kept.                                                                                    | Brief, The Task                                          |
| **BR-08** | Logbook upload is available only once a Badge is selected. Any change to the vehicle (Make, Model, Badge or a different quick-select) clears the attached logbook.                   | Brief, The Task; _assumption A-03_                       |
| **BR-09** | The logbook must be one file, either plain text (`.txt`, `text/plain`) or JSON (`.json`, `application/json`). It must be UTF-8, non-empty, and no larger than **1 MB**.              | Brief, The Task; _assumptions A-04, A-05; decision D-03_ |
| **BR-10** | At least two quick-select buttons exist. Each one sets Make, Model and Badge to a valid catalogue vehicle and replaces any current selection.                                        | Brief, The Task                                          |
| **BR-11** | A quick-select that changes the vehicle follows BR-08: any attached logbook is cleared.                                                                                              | _Assumption A-03_                                        |
| **BR-12** | The form can be submitted only when Make, Model, Badge and a valid logbook are all present.                                                                                          | Brief, Submission                                        |
| **BR-13** | The form is submitted as a single `multipart/form-data` POST to the API.                                                                                                             | Brief, Submission                                        |
| **BR-14** | The API re-validates BR-02 and BR-09 itself and never trusts the client. Invalid requests are rejected with a 4xx response and a reason.                                             | _Real-world practice_; brief, "Build it like it's real"  |
| **BR-15** | A successful response contains the Make, Model, Badge, the logbook's format and its full text, plus the parsed entries for a JSON logbook (BR-20).                                   | Brief, Submission                                        |
| **BR-16** | The page shows the returned Make, Model, Badge and logbook contents. A text logbook is shown as literal text with whitespace kept. User-supplied text is never interpreted as HTML.  | Brief, Submission; _security_                            |
| **BR-17** | The API is the single source of truth for the catalogue (`GET /api/vehicles`). The client does not keep its own copy.                                                                | _Design decision D-01_                                   |
| **BR-18** | Uploaded files are temporary. The API reads the file with `node:fs` and removes it from disk once the request is finished, whether it succeeded or failed.                           | _Assumption A-06_                                        |
| **BR-19** | A JSON logbook must parse as JSON and match the logbook JSON format (section 4). Otherwise it is rejected with a message naming the first problem found.                             | _Decision D-03_                                          |
| **BR-20** | For a JSON logbook, the page shows the entries as a table (Date, Odometer, Description, Workshop), one row per entry in file order.                                                  | _Decision D-03_                                          |

## 6. User stories and acceptance criteria

Priorities use MoSCoW. Acceptance criteria are written in Given/When/Then form.

---

### US-01 — Select a Make · **Must**

**As a** user identifying my vehicle
**I want to** choose its Make from a list
**So that** I only see Models that belong to that manufacturer.

**AC-01.1** — Makes listed
- **Given** the form has loaded
- **When** I open the Make dropdown
- **Then** I see Ford, BMW and Tesla, and nothing is selected yet.

**AC-01.2** — Downstream fields unavailable
- **Given** no Make is selected
- **Then** Model, Badge and Logbook upload are disabled.

**AC-01.3** — Catalogue unavailable
- **Given** the catalogue request fails
- **Then** I see an error message with a way to retry, and the dropdowns stay disabled.

_Rules: BR-03, BR-04, BR-17_

---

### US-02 — Select a Model · **Must**

**As a** user who has picked a Make
**I want to** choose from only that Make's Models
**So that** I can't pick a combination that doesn't exist.

**AC-02.1** — Models filtered by Make
- **Given** I selected **Ford**
- **When** I open the Model dropdown
- **Then** I see exactly Ranger, Falcon and Falcon Ute.

**AC-02.2** — Badge locked until Model chosen
- **Given** a Make is selected and no Model is selected
- **Then** Badge and Logbook upload are disabled.

_Rules: BR-04, BR-05_

---

### US-03 — Select a Badge · **Must**

**As a** user who has picked a Model
**I want to** choose from only that Model's Badges
**So that** my exact variant is recorded.

**AC-03.1** — Badges filtered by Model
- **Given** I selected **Ford → Ranger**
- **When** I open the Badge dropdown
- **Then** I see exactly Raptor, Raptor X and Wildtrak.

**AC-03.2** — Shared badge names resolve per Model
- **Given** I selected **Ford → Falcon Ute**
- **Then** I see XR6 and XR6 Turbo, and XR8 is **not** listed.

**AC-03.3** — Upload unlocked
- **Given** I select a Badge
- **Then** Logbook upload becomes enabled.

_Rules: BR-02, BR-05, BR-08_

---

### US-04 — Change an earlier selection · **Must**

**As a** user who picked the wrong Make or Model
**I want** the fields that depend on it to reset
**So that** I never submit a stale or impossible combination.

**AC-04.1** — Changing Make resets Model and Badge
- **Given** I selected **Ford → Ranger → Raptor**
- **When** I change Make to **Tesla**
- **Then** Model and Badge are cleared
- **And** Model offers only Model 3
- **And** Badge is disabled until I pick a Model.

**AC-04.2** — Changing Model resets Badge only
- **Given** I selected **Ford → Ranger → Raptor**
- **When** I change Model to **Falcon**
- **Then** Make stays **Ford**, Badge is cleared, and Badge offers XR6, XR6 Turbo and XR8.

**AC-04.3** — Attached logbook cleared
- **Given** I selected a full vehicle and attached a logbook
- **When** I change the Make, Model or Badge
- **Then** the attached logbook is cleared
- **And** if the Badge was cleared, upload is disabled until I select a Badge again.

**AC-04.4** — Re-selecting the same value
- **Given** I selected **Ford → Ranger → Raptor**
- **When** I pick **Ford** again in the Make dropdown
- **Then** nothing is cleared.

_Rules: BR-06, BR-07, BR-08_

---

### US-05 — Quick-select a common vehicle · **Must**

**As a** user with a popular vehicle
**I want** a one-click shortcut
**So that** I don't have to fill in three dropdowns.

**AC-05.1** — Presets shown
- **Given** the form has loaded
- **Then** I see at least two quick-select buttons, each labelled with its full vehicle (for example "Ford Ranger Raptor" or "Tesla Model 3 Performance").

**AC-05.2** — All three fields filled
- **Given** any form state
- **When** I click **Ford Ranger Raptor**
- **Then** Make is Ford, Model is Ranger and Badge is Raptor
- **And** each dropdown lists the correct options for those values
- **And** Logbook upload is enabled.

**AC-05.3** — Replaces the current selection
- **Given** I selected **BMW → 240i → xDrive 50d** and attached a logbook
- **When** I click **Tesla Model 3 Performance**
- **Then** all three fields show the Tesla preset and the logbook is cleared.

**AC-05.4** — Presets are valid
- Every preset is a valid catalogue vehicle (BR-02), checked by an automated test.

_Rules: BR-10, BR-11, BR-02_

---

### US-06 — Attach a service logbook · **Must**

**As a** user who has identified my vehicle
**I want to** attach its service logbook as a text or JSON file
**So that** the service history is submitted with the vehicle.

**AC-06.1** — Valid file accepted
- **Given** a Badge is selected
- **When** I choose a non-empty UTF-8 `.txt` file, or a valid JSON logbook (`.json`), of 1 MB or less
- **Then** the file name is shown and Submit becomes enabled.

**AC-06.2** — Wrong file type rejected
- **When** I choose a file that is neither plain text nor JSON (for example `.pdf` or `.png`)
- **Then** I see "Logbook must be a plain text (.txt) or JSON (.json) file" and Submit stays disabled.

**AC-06.3** — Empty or oversized file rejected
- **When** I choose an empty file, or one larger than 1 MB
- **Then** I see a message stating the rule, and Submit stays disabled.

**AC-06.4** — One file only
- The picker accepts a single file. Choosing another file replaces the first.

**AC-06.5** — Unreadable JSON rejected
- **When** I choose a `.json` file that is not valid JSON
- **Then** I see "Logbook is not valid JSON" and Submit stays disabled.

**AC-06.6** — JSON that does not match the format rejected
- **When** I choose a `.json` file that breaks the logbook JSON format (for example, an entry with no `date`)
- **Then** I see a message naming the first problem, such as "Entry 1: date must be a date in YYYY-MM-DD format", and Submit stays disabled.

_Rules: BR-08, BR-09, BR-12, BR-19_

---

### US-07 — Submit and see confirmation · **Must**

**As a** user with a complete form
**I want to** submit it and see what the server received
**So that** I know my vehicle and logbook were captured correctly.

**AC-07.1** — Successful submission
- **Given** Make, Model, Badge and a valid logbook are all set
- **When** I click **Submit**
- **Then** the form POSTs `multipart/form-data` to the API
- **And** while the request is in flight, Submit is disabled and shows a loading state
- **And** on success the page shows the returned Make, Model, Badge and logbook contents.

**AC-07.2** — Logbook shown safely
- **Given** the logbook contains markup such as `<script>` or `<b>`
- **Then** it is shown as literal text, with line breaks and spacing kept.

**AC-07.4** — JSON logbook shown as a table
- **Given** I submitted a valid JSON logbook
- **Then** I see a table with the columns Date, Odometer (km), Description and Workshop, with one row per entry in file order.

**AC-07.3** — Incomplete form
- **Given** any required field is missing
- **Then** Submit is disabled. If submission is attempted anyway (for example with the Enter key), each missing field shows an inline message.

_Rules: BR-12, BR-13, BR-15, BR-16, BR-20_

---

### US-08 — Recover from a failed submission · **Must**

**As a** user whose submission failed
**I want** a clear reason, with my inputs kept
**So that** I can fix the problem and try again.

**AC-08.1** — Server rejects the request
- **Given** the API responds with a 4xx status
- **Then** I see the API's message, and my selections and file are kept.

**AC-08.2** — Network or server error
- **Given** the API is unreachable or returns a 5xx status
- **Then** I see "Something went wrong, please try again", and my inputs are kept.

_Rules: BR-14_

---

### US-09 — API validates every submission · **Must** (technical)

**As the** system owner
**I want** the API to enforce the vehicle and file rules itself
**So that** bad data is rejected even if the client is bypassed.

**AC-09.1** — Invalid combination: a POST with `make=ford, model=Ranger, badge=XR8` returns **400** with a message naming the invalid field.
**AC-09.2** — Missing field: a POST without `badge` returns **400**.
**AC-09.3** — Wrong file type: a file that is neither plain text nor JSON returns **415**.
**AC-09.4** — Oversized file: a file over 1 MB returns **413**.
**AC-09.5** — Missing or empty file returns **400**.
**AC-09.6** — Clean-up: after any request, no uploaded file is left on disk.
**AC-09.7** — Success: a valid request returns **200** with a `LogbookSubmission` (section 7). `logbook.content` is the exact file text.
**AC-09.8** — Invalid JSON logbook: a `.json` file that breaks BR-19 returns **400** with a message naming the problem.

_Rules: BR-02, BR-09, BR-14, BR-15, BR-18, BR-19_

---

### US-10 — Run the project locally · **Must** (reviewer)

**As a** reviewer
**I want** clear setup instructions
**So that** I can run and assess the solution quickly.

**AC-10.1** — The README lists the prerequisites (Node and pnpm versions), install, dev, build, lint and test commands.
**AC-10.2** — `pnpm install && pnpm dev` starts both the web app and the API, and the form works end to end with no further setup.
**AC-10.3** — The repo includes a sample JSON logbook (`samples/logbook.json`) for end-to-end testing.

---

### US-11 — Accessible form · **Should**

**As a** keyboard or screen-reader user
**I want** the form to be fully operable without a mouse
**So that** I can complete it independently.

**AC-11.1** — Every control has a visible, programmatically linked `<label>`.
**AC-11.2** — Disabled fields explain why they are disabled (for example "Select a Make first").
**AC-11.3** — Validation errors are linked to their field with `aria-describedby`. The result panel is announced with `aria-live="polite"`.
**AC-11.4** — The whole flow, including quick-select, upload and submit, can be completed with the keyboard alone.

---

### US-12 — Start again · **Could**

**As a** user who has seen my result
**I want to** reset the form
**So that** I can submit another vehicle.

**AC-12.1** — A **Reset** action clears all fields, the file and the result panel.

## 7. API contract

| Method | Path            | Request                                                           | Success                               | Errors                     |
| ------ | --------------- | ----------------------------------------------------------------- | ------------------------------------- | -------------------------- |
| `GET`  | `/api/health`   | —                                                                 | `200 { status: "ok" }`                | —                          |
| `GET`  | `/api/vehicles` | —                                                                 | `200 VehicleCatalogue`                | `500`                      |
| `POST` | `/api/logbooks` | `multipart/form-data`: `make`, `model`, `badge`, `logbook` (file) | `200 LogbookSubmission`               | `400`, `413`, `415`, `500` |

```ts
type LogbookSubmission = {
  make: string; // catalogue key, e.g. "ford"
  model: string;
  badge: string;
  logbook:
    | { format: 'text'; content: string }
    | { format: 'json'; content: string; entries: LogbookEntry[] };
};

type LogbookEntry = {
  date: string; // YYYY-MM-DD
  odometerKm: number;
  description: string;
  workshop?: string;
};
```

Error body: `{ "error": { "code": string, "message": string, "field"?: string } }`

| Code                | Status | When                                                        |
| ------------------- | ------ | ----------------------------------------------------------- |
| `MISSING_FIELD`     | 400    | `make`, `model` or `badge` is missing                       |
| `INVALID_VEHICLE`   | 400    | The vehicle is not in the catalogue; `field` names the part |
| `MISSING_FILE`      | 400    | No logbook file was attached                                |
| `EMPTY`             | 400    | The logbook file is empty                                   |
| `NOT_UTF8`          | 400    | The logbook is not UTF-8 text                               |
| `INVALID_JSON`      | 400    | A JSON logbook breaks BR-19; `message` names the problem    |
| `INVALID_UPLOAD`    | 400    | More than one file, or unexpected form fields               |
| `UNSUPPORTED_TYPE`  | 415    | The file is neither plain text nor JSON                     |
| `TOO_LARGE`         | 413    | The file is over 1 MB                                       |
| `TOO_MANY_REQUESTS` | 429    | More than 30 uploads from one IP address in a minute        |
| `INTERNAL_ERROR`    | 500    | Anything unexpected; details are logged, not returned       |

## 8. Non-functional requirements

| ID     | Requirement                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Front end: React and TypeScript (Vite). Back end: Node.js, Express and TypeScript.                                                  |
| NFR-02 | Strict TypeScript. Lint and format checks (Biome and SonarJS) pass with no errors. Cognitive complexity per function is 10 or less. |
| NFR-03 | Unit tests cover the cascade rules (BR-04 to BR-08) and API validation (US-09).                                                     |
| NFR-04 | User-supplied text is never rendered as HTML (XSS). Upload size is capped at 1 MB (DoS).                                            |
| NFR-05 | Uploads are written to a temporary directory and always deleted afterwards (BR-18).                                                 |

## 9. Assumptions, decisions and open questions

| ID   | Type       | Item                                                                                                                                                                                                                                                 |
| ---- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 | Assumption | Make display labels: Ford, BMW, Tesla. Model and Badge are shown exactly as they appear in the data.                                                                                                                                                 |
| A-02 | Assumption | There is no default selection on load. The user starts from Make or a quick-select.                                                                                                                                                                  |
| A-03 | Assumption | A logbook belongs to a specific vehicle, so changing the vehicle clears it. **Confirm against the demo video.**                                                                                                                                      |
| A-04 | Assumption | Plain text means `text/plain` / `.txt`; JSON means `application/json` / `.json`. Both are UTF-8. Browsers sometimes report no type, so the extension is the fallback.                                                                                |
| A-05 | Assumption | The size limit is 1 MB, which is generous for a text or JSON logbook.                                                                                                                                                                                |
| A-06 | Assumption | Submissions are not stored. The API echoes the data back and discards the file.                                                                                                                                                                      |
| D-01 | Decision   | The catalogue is served by the API (BR-17), so client and server cannot drift apart.                                                                                                                                                                 |
| D-02 | Decision   | Quick-select presets: **Ford Ranger Raptor**, **Tesla Model 3 Performance** and **BMW 130d xDrive 26d**.                                                                                                                                             |
| D-03 | Decision   | Logbooks can be JSON as well as plain text. JSON gives service history a structure that can be created, read, updated and deleted later. Plain text stays supported because the brief requires it and reviewers test with their own plain-text file. |
| Q-01 | Open       | Should the form reset after a successful submission, or keep the values? (Assumed: keep them, and offer a Reset as in US-12.)                                                                                                                        |
| Q-02 | Open       | Does the demo video show any behaviour not covered here, such as the success message wording or the button placement?                                                                                                                                |

## 10. Traceability

| Requirement in brief                                | Business rules        | Stories             |
| --------------------------------------------------- | --------------------- | ------------------- |
| Make → Model → Badge selection                      | BR-01 to BR-05        | US-01, US-02, US-03 |
| Clear dependents when Make or Model changes         | BR-06, BR-07, BR-08   | US-04               |
| Quick-select buttons (2 or more)                    | BR-10, BR-11          | US-05               |
| Upload a logbook after a Badge is chosen            | BR-08, BR-09, BR-19   | US-06               |
| POST to the server; response shown on the page      | BR-12 to BR-16, BR-20 | US-07, US-08, US-09 |
| README with run instructions                        | —                     | US-10               |
| "Build it like it's real" / "Function and UX"       | BR-14, BR-18          | US-08, US-09, US-11 |
