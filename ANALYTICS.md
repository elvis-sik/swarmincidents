# Traffic, growth and usefulness

The private dashboard is [swarmincidents.goatcounter.com](https://swarmincidents.goatcounter.com/). Collection starts with the October 7, 2026 deployment; earlier traffic is unknown, not zero.

## What to read

| Question | Metric | Interpretation |
| --- | --- | --- |
| Are we reaching people? | `/` visits and Totals with **Exclude events** | Deduplicated visits within GoatCounter's 8-hour session window. One landing path for every site entry, including deep links; clicks never increase this total. Not distinct people over a month. |
| Is reach growing? | Last 7 complete days versus the previous 7; daily chart over a month | `(current / previous - 1) × 100%`, only when previous is above zero. Wait for two complete measured weeks; exclude the partial launch day and today. If previous is zero, report the count increase. |
| Do people give it attention? | `engaged-30s` and `engaged-2m`, divided by `/` visits in the same period | Approximate attention shares. Time accrues only when visible and focused. Reading cannot be established with certainty; multiple tabs and repeat sessions make ratios approximate. |
| Does the synthesis prompt exploration? | `incident-open`, `reader-open`, `thread-open`, `post-open`, divided by `/` visits | Aggregate action rows count each action once per page load, deduplicated again by GoatCounter. Rows ending in `/content-id` identify popular incidents and threads. Do not sum them to estimate people. |
| Does it send people to evidence? | `source-open` and `archive-open`, divided by `/` visits | A signal that the site directs readers to original work. A source click is not proof the destination was read. Hostname rows show which research is followed. |
| Where does growth come from? | Top referrers and Campaigns | Distinguish search, social, newsletters and deliberate sharing. Use `?utm_source=x&utm_medium=social&utm_campaign=launch` on campaign links. These panels describe arrivals; event referrers are blank. |
| Which features need attention? | `view/*`, `wording/*`, `models/*`, device/browser summaries | Feature adoption and compatibility clues. Search queries and raw post bodies are never sent. |

The path filter matches paths and titles: try `engaged-`, `incident-open`, `reader-open`, `source-open`, or `post-open`. Clear it to return to the complete overview. The Pages total mixes events and visits: use **Totals (excluding events)** for reach.

The preferred weekly pair is **visits + two-minute attention share**, supported by incident exploration and source-following shares. More visits with falling engagement may mean a low-quality referral spike; fewer visits with stronger exploration may still represent more useful reading. No single score establishes impact. GoatCounter does not provide durable identity, cross-week returning-user cohorts, or evidence that readers changed their decisions.

## Collection and operations

- `analytics.js` loads GoatCounter only on production HTTPS hosts, never localhost or previews. `build.py` copies it into `docs/`.
- Each initial load contributes one non-event path, `/`. App hooks cover programmatic navigation and deep links; hash changes do not inflate pageviews.
- A blocked or missing provider leaves the site usable. Early events queue until a visible landing is counted. Repeated actions are deduplicated per page load and by the provider's session rules.
- Browser opt-out: open `https://swarmincidents.com/#toggle-goatcounter`; opening it again toggles back. This uses GoatCounter's `skipgc` preference, not a visitor ID. About includes the disclosure and toggle link.
- Only `utm_source`, `utm_medium`, and `utm_campaign` are forwarded from query strings. Referrers are reduced to origins; source events carry hostnames, never destination queries. No search text, personal identities, analytics cookies or persistent visitor IDs are added by this integration.
- Dashboard access remains restricted to logged-in users. Individual raw pageview exports remain off. Sessions stay on to suppress reload inflation. No API key is required in the site.
- Widgets: Paths overview shows 30 rows; Totals excludes events; referrals, campaigns, locations and device/browser summaries remain available. Unused Languages was removed.
- Verify with `node --test tests/unit/analytics.cjs`, Playwright, and a controlled live browser visit. Treat setup traffic as test activity when reading the first day. Ad blockers and bot filtering mean these figures are estimates.
- Rollback: remove the analytics include and hooks, rebuild and deploy. Historical dashboard data remains available.

Provider definitions: [sessions](https://www.goatcounter.com/help/sessions), [events](https://www.goatcounter.com/help/events), [campaigns](https://www.goatcounter.com/help/campaigns), [JavaScript API](https://www.goatcounter.com/help/js).
