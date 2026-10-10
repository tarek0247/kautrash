# API verification — 10 October 2026

## Verified live

- The application's BIIP adapter returned all 60 Lithuanian municipalities.
- Its settlement lookup succeeded for every municipality: 60/60, with nonempty lists and pagination exercised.
- Street and house-number requests were tested for Alytus, Kaunas, Kaunas district, Klaipėda, Panevėžys, Šiauliai and Vilnius. A street without registered house numbers can legitimately return an empty list; manual house entry remains available.
- An additional full municipality → eldership → settlement → street → house lookup succeeded in Akademija, Kaunas district.
- All 16 city schedule pages linked from Ecoservice's public 2026 directory returned HTTP 200 and published document links.

## Automatic collection schedules are not verified or restored

- Švara's public frontend now uses `/api/session` and Cloudflare Turnstile. A direct server-function request from this environment returned HTTP 403. The previous generic `apiPath` adapter cannot establish that browser verification session.
- The adapter now reports access rejection immediately and bounds each API request to 12 seconds rather than repeatedly trying function IDs after an access rejection.
- There is no single collection API for all Lithuanian municipalities. BIIP returns addresses, not pickup dates. Ecoservice's public directory and embedded report are schedule sources, not an implemented automatic API integration in this app.
- Opening a provider page successfully does not verify a collection date for a particular household.

## Application changes

- Settings chooses official source links by municipality instead of directing every municipality to Švara.
- Ecoservice links explicitly require users to confirm it is their operator. Unknown municipalities retain a general operator lookup; coverage is not claimed for every operator.
- Imported dates and recurring-calendar imports remain available. No pickup dates are generated from address lookup.
- TypeScript and the production build passed.

## Public sources

- https://boundaries.biip.lt/v1
- https://grafikai.svara.lt/
- https://ecoservice.lt/grafikai/
