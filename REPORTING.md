# Incident reporting

The header's Report button opens an accessible dialog for incident reports and corrections. It collects a description, optional source links and an optional reply email. The editor receives the submission at `report@swarmincidents.com`; the dialog also links directly to that address. About keeps `hello@swarmincidents.com` for general contact and links to reporting separately.

GitHub Pages serves the frontend. The existing public analytics Worker handles `https://analytics.swarmincidents.com/api/report` and `/api/report/config`. Its source lives in the private ops repo's `analytics-dashboard/`. No browser credentials or JavaScript dependencies are added.

## Activation

Before publishing the frontend and backend:

1. Verify `swarmincidents.com` for sending in Resend. Preserve SimpleLogin's root MX, SPF, DKIM and DMARC. Add only the records Resend supplies (its DKIM selector and sending-subdomain records); do not enable root receiving or replace root MX.
2. Create a dedicated Resend key named `swarm-incidents-report`, with **Sending access** restricted to `swarmincidents.com`. Store it as the Worker secret `RESEND_API_KEY`. Preserve the unrelated coaching key.
3. Create a managed Cloudflare Turnstile widget allowing only `swarmincidents.com` and `www.swarmincidents.com`. Store its public `TURNSTILE_SITE_KEY` and secret `TURNSTILE_SECRET_KEY` in the same Sites project. The browser fetches only the public key; verification checks the returned hostname and the `report` action.
4. Run the backend checks and build, synchronize the exact source with the Sites source helper, and deploy a saved version of the existing analytics Site. Preserve its audience and GoatCounter token. Configure secrets through the native Sites environment tools.
5. Verify the production configuration endpoint from an allowed origin, then publish the built frontend through the existing GitHub Pages workflow. Submit a unique owned-address fixture and confirm forwarding and mailbox delivery before declaring delivery verified.

Until configured, the endpoint returns an unavailable error and the dialog retains the draft with the direct-email option. Local browser tests mock the provider and challenge; they do not send real messages.

## Behavior and checks

The server fixes both From and To to the reporting identity and uses a plain-text body. It validates fields and total request size, rejects a filled honeypot, verifies Turnstile, and sends through Resend only after verification. The optional visitor email becomes Reply-To. Source URLs are text, never fetched. User content and credentials are not logged or stored in the public repository. Reports are delivered for review, not published automatically.

The browser keeps form content when sending fails, prevents concurrent sends and reuses the same Resend idempotency identifier for retries of unchanged content. A success confirmation means Resend accepted the email, not proof of final inbox delivery.

Tests: `./node_modules/.bin/playwright test tests/report.spec.js` in this repository; `node --test tests/reports.test.mjs` in the private analytics Worker checkout. Run the existing site suite after layout changes. Header changes require refreshed Linux visual baselines before merging into main.

Rollback: revert the report frontend and report route changes; retain the receiving alias so direct reports remain reachable. Do not change existing domain routing or revoke unrelated provider keys.
