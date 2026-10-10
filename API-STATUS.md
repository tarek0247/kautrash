# Schedule API verification — 10 October 2026

## Automatic source now connected

Ecoservice publishes an unauthenticated Power BI collection report linked from its official schedule page. The new server adapter reads report metadata, filters by the published municipality and street, requires an exact house/settlement match, and reads upcoming dates for the matching container numbers. It rejects truncated results and does not infer waste types from container numbers. Neutral collection icons identify schedules whose waste type is not supplied.

The live report listed 20 municipality labels: Biržai, Kalvarija, Kazlų Rūda, Klaipėda, Lazdijai, Marijampolė, Mažeikiai, Neringa, Plungė, Radviliškis, Šakiai, Šalčininkai, Šiauliai, Šilutė, Širvintos, Tauragė, Trakai, Varėna, Vilkaviškis and Vilnius city. These are operator report regions, not a claim that every address or every operator in those municipalities is covered. Vilnius district is deliberately excluded from the city mapping.

A live execution of the actual TypeScript adapter for Alksnynės g. 2, Neringa returned 214 provider-published future dates, beginning 2026-10-12. The report metadata and query endpoint returned HTTP 200. The adapter fetches the current dataset ID rather than keeping a deployment-specific model ID in the code.

Adding an address and opening a saved address initiate automatic lookup from Home. Failure keeps saved/imported dates. Manual entry and recurring ICS/TXT import remain in a collapsed backup section. Exact address matches are required; apartment schedules are not silently substituted with a building schedule.

## Remaining operator limits

Švara now requires an official browser verification session. The old generic server-function adapter is not compatible. Kaunas city and district show a specific official-verification message and source link rather than repeatedly calling stale IDs. This is NOT a restored Švara integration. Other operators without a connected source retain local official source links and optional backup import. No dates are fabricated.

## Address API and checks

The BIIP adapter previously returned all 60 municipalities and nonempty settlement lists for 60/60, with representative street/house lookups. BIIP is an address register, not a collection calendar.

Focused tests cover exact house/settlement matching, municipality aliases, Power BI dictionary/repeat/null decoding, truncated response rejection, neutral waste type, recurring ICS import and export. TypeScript and the local production build passed. Browser visual testing is not claimed.

Sources: https://ecoservice.lt/grafikai/ ; https://grafikai.svara.lt/ ; https://boundaries.biip.lt/v1
