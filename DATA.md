# Data format

`incidents.json` holds everything the site shows. Dates are `YYYY-MM-DD`. It is edited in the private ops repo, where pipeline proposals are reviewed as pull requests, and copied here on merge, together with this file. Run `python3 build.py` after any change.

## Top level

| Field | Notes |
|---|---|
| `updated`, `version` | Shown on the page and in the JSON-LD metadata |
| `contact` | Email shown under About › Missing something (empty hides it) |
| `labs` | Developers whose models appear in the data (`unknown` means their identities are unconfirmed): `{slug: {name}}`. The site's model filter lists them |
| `incidents`, `responses`, `affected` | Below |
| `unknowns` | Text; `[label](#incident-id)` becomes a link to that incident |

## `incidents[]`

| Field | Notes |
|---|---|
| `id` | Stable slug used in links (`#<id>`); never change it |
| `title` | Lead with the place or thing a reader would look for ("German wiki used as a back channel"), not a number or a hook. Under about 60 characters |
| `labs` | Developer slugs (keys of `labs`) whose models were involved, e.g. `["openai"]` or `["anthropic", "openai"]` |
| `response_title` | Optional heading for `lab_response`, used when the account concerns an operator rather than an identified model developer |
| `runby` | Who ran the agents: `developer`, `evaluator` (name it in the summary) or `unknown` (swarms in the wild) |
| `category` | Optional `benchmark-integrity`: observed answer retrieval or scoring manipulation, shown as a label on the incident card. It does not assert an attack, access violation or alignment failure |
| `summary`, `lab_response`, `found`, `status` | Text shown on the card; `lab_response` is what the developer said or did |
| `activity[]` | `{s, e, label}`: when agents were active. `approx: true` for loosely reported windows; `sub: true` for notable sub-windows |
| `knew` | `{d, text}`: when the developer is documented as knowing |
| `reveals[]` | `{d, by, text}`: public reports. `by` is `lab` (the developer of the incident's models), `research`, `press`, `gov` or `other`; `minor: true` for secondary markers; `private: true` for private notices |
| `sources[]` | `[title, publisher, url]` |
| `datasets[]` | Optional publisher-hosted research releases. A nonempty list enables the Dataset available filter and badge. Reports, screenshots and benchmark task data alone do not qualify |

Each `datasets[]` entry has a stable `id`, `title`, `publisher`, human-readable `format`, publisher/release `url`, `description`, and a `checked` date (`YYYY-MM-DD`). Optional `download` links directly to the publisher's file, and `note` describes coverage or restrictions that affect research use. Keep partial transcripts, reconstructed payloads, metadata catalogs and aggregates distinguishable. Availability is not a claim of completeness or permission to mirror or train on the data. Shared releases can appear on more than one incident; filtered incident counts are not counts of independent datasets.

## `responses[]`

| Field | Notes |
|---|---|
| `id` | Stable slug used in links (`#response/<id>`); never change it |
| `title` | Short name shown on the chart and the card |
| `d` | Date; `label` optionally replaces the date text |
| `who` | `lab` (an AI developer; set `lab` to its slug), `gov` or `other` |
| `labs` | Optional developer slugs the response concerns when `inc` doesn't say (e.g. an accord several developers signed) |
| `inc` | Incident ids it relates to |
| `text` | What happened |
| `src[]` | `[title, publisher, url]` sources for the response itself |

## `affected[]`

One entry per organization, site or service.

| Field | Notes |
|---|---|
| `id`, `name` | Stable slug (`#affected/<id>`) and display name |
| `kind` | `gov`, `edu`, `company`, `community` or `lab` (a developer's own systems) |
| `where` | Optional country or region |
| `inv[]` | Its involvement in each incident, below |

`inv[]` fields:

| Field | Notes |
|---|---|
| `inc` | Incident id |
| `what` | `breach`, `account` (a customer's account on the service), `attack`, `creds`, `source`, `spam`, `scrape`, `tool`, `reach` or `possible` |
| `attr` | `'unclear'` when the source doesn't tie the activity to that developer's agents specifically |
| `d`, `e` | Start and end dates drawn on the chart; `approx: true` when inferred from a loose `when` such as “July”. Empty when not reported |
| `when` | Date text shown to readers |
| `note` | What happened there |
| `src` | Source URLs; each must also appear in some incident's `sources` |
