# Quiet chat date dividers — September 15, 2026

## Goal and scope

Help a reader identify which day messages belong to without adding controls or reducing composer space. The owner requested a subtle treatment. Reused existing graphite metadata colors, centered label typography and the focused conversation shell. No new service, schema, animation or dependencies.

## Observed checks

- All 460 existing-plus-date automated tests passed. Fourteen new tests cover local/UTC boundaries, offset equivalence, leap-day/month/year rollover, DST 23/25-hour days, mixed media/tombstones, invalid metadata, merged history, stable keys, midnight/resume/zone-change refresh, listener cleanup and noninteractive accessible markup.
- TypeScript and focused lint passed. The final combined artwork/date suite passes 468 tests; full lint has zero errors and five pre-existing warnings.
- Signed-in browser at 582 × 922: The District showed one September 7 divider; a direct test-account conversation showed September 7 and Yesterday in the correct positions. No messages were sent, changed or removed during this pass.
- The day-divider and 582px-wide conversation region shared the exact horizontal center (0px measured delta). The row measured 32px high, with a compact 24px label and symmetric decorative rules. Bubble content remained snug and composer controls stayed in place.
- Screenshot inspection confirmed the quiet graphite treatment. The label uses a fully opaque background independently of any artwork; this pass did not change saved appearance preferences or exercise a new artwork background.
- Dividers use filtered visible history, not fetch-page chunks. Prepend/reading-position regressions pass. Stable keyed fragments retain voice/media component identity when a boundary moves to an older message.

## Untested and delivery boundaries

Physical iOS/Android layouts, 320/390px and large desktop visual measurements, enlarged-text and screen-reader use, and a real midnight transition were not manually exercised in this pass. Calendar edge cases have executable tests, not a claim of complete device coverage. Publishing, hosted build and backup completion are recorded in the canonical GitHub release checklist after verification.
