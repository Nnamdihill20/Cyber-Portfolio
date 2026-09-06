# Data sources

## Layer A — ALPR cameras

| Source | Coverage | Access |
|---|---|---|
| [DeFlock](https://deflock.me) | Community-mapped, multi-vendor ALPR, largest open dataset | Public map + downloadable OSM-tagged data (`man_made=surveillance`, `surveillance:type=ALPR`) |
| [EFF Atlas of Surveillance](https://atlasofsurveillance.org) | Multi-vendor, includes procurement-record-sourced entries | Public dataset, CSV export available |
| Municipal council minutes / procurement records | Flock, Motorola/Vigilant, Genetec contracts | FOIA / public-records requests per city |

Import with `packages/api/seed/import-alpr-cameras-csv.ts` after exporting
either source to CSV matching the columns documented in that script's header
comment.

## Layer C — Facilities

| Source | Covers | Access |
|---|---|---|
| [ICE ERO field office locator](https://www.ice.gov/contact/ero) | ICE field/sub-offices | Public locator page |
| [EOIR court locator](https://www.justice.gov/eoir/eoir-immigration-court-listing) | Immigration courts | Public listing |
| [TRAC Immigration](https://tracreports.org) | Detention facility data & enforcement statistics | Public reports/datasets |
| [Freedom for Immigrants detention map](https://www.freedomforimmigrants.org/map) | Detention facilities | Public map |
| OpenStreetMap (`amenity=police`) via [Overpass API](https://overpass-api.de) | Police/sheriff stations | Free API, no key required |

Import police/sheriff stations directly with
`packages/api/seed/import-osm-police.ts <minLat> <minLon> <maxLat> <maxLon>`.
Import the others via `packages/api/seed/import-facilities-csv.ts` after
manually exporting/transcribing from the source (most of these don't offer
a stable public API, so this is a periodic manual-refresh job, not a live
feed — track `lastVerifiedAt` per record and re-check on a schedule).

## Layer B — Activity reports

No external source — anonymous community submission only, through the app
itself. See `docs/MODERATION.md` for abuse-prevention design before
enabling submissions publicly.
