# Original-design upgrades

This branch keeps the original layout, typography, palette, navigation and logo.
New controls reuse existing design tokens and live mainly in collapsible Settings sections.

## Available

- Multiple addresses with locally persisted schedules and per-address reminder selection.
- Explicit collection-date entry and TXT/all-day ICS import, with a source and user confirmation.
- ICS export without home addresses; selected collection reminders are included as calendar alarms.
- English, Lithuanian and Russian interface, date formatting and sorting guide.
- Searchable sorting guide and downloadable missed-collection report drafts.
- Windows-compatible Vite launcher preserving the existing environment wrapper.

## Important limits

- Direct Švara schedule retrieval is paused. Its current site uses a protected session flow. No protection is bypassed and no collection dates are invented.
- Address lookup/GPS remain the existing BIIP implementation; nationwide address coverage does not mean nationwide provider schedule integration.
- Data is saved on this browser/device, not synced to an account. Clearing browser storage removes it. Export dates before clearing storage.
- Browser notifications only run when the app is open; calendar alarms depend on the receiving calendar application. Reports are drafts, not sent to an operator.
- Existing PWA infrastructure is unchanged. An address lookup needs a network connection.
- Company accounts, an authenticated admin dashboard, production Stripe subscriptions and deployment are not included in this batch. They need approved billing configuration and authorized deployment access.

## Verify

Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.
For local Windows preview, run `npm run dev -- --port 5173` and open http://localhost:5173.
Build may run existing database migrations if DATABASE_URL is configured; use a test database when validating.
