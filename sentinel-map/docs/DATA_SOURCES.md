# Data sources

## Layer A — ALPR cameras

**Preferred: `packages/api/seed/import-alpr-from-osm.ts <minLat> <minLon> <maxLat> <maxLon>`.**
DeFlock doesn't host its own database - every camera on its map is an
OpenStreetMap node/way tagged `man_made=surveillance` +
`surveillance:type=ALPR` (per the [OSM wiki](https://wiki.openstreetmap.org/wiki/Tag:surveillance:type=ALPR)),
queried live via Overpass, same as DeFlock's own site. As of early 2026
that registry passed 336,000 tagged cameras worldwide across every major
vendor. Querying Overpass directly - the same mechanism
`import-osm-police.ts` already uses for police stations - gets you current
data for any bounding box, live, instead of a CSV snapshot that goes stale
the moment OSM contributors add or correct an entry.

| Source | Coverage | Access |
|---|---|---|
| OpenStreetMap ALPR tags via [Overpass API](https://overpass-api.de) | Multi-vendor, 336k+ tagged cameras worldwide (this is DeFlock's actual backing data) | Free API, no key required - see script above |
| [EFF Atlas of Surveillance](https://atlasofsurveillance.org) | Multi-vendor, includes procurement-record-sourced entries not always on OSM | Public dataset, CSV export available |
| Municipal council minutes / procurement records | Flock, Motorola/Vigilant, Genetec contracts | FOIA / public-records requests per city |

The EFF dataset and FOIA records still have value on top of OSM (some
procurement-sourced entries aren't independently mapped on OSM) - import
those via `packages/api/seed/import-alpr-cameras-csv.ts` after exporting to
CSV matching the columns documented in that script's header comment.

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

## Support resources — legal aid & know-your-rights

| Source | Covers | Access |
|---|---|---|
| [ImmigrationLawHelp.org](https://www.immigrationlawhelp.org) | National directory of nonprofit immigration legal service providers | Public directory, searchable by location |
| [211.org](https://www.211.org) | General local health/legal/social service referrals by area | Public directory |
| State ACLU affiliates | State-specific know-your-rights guidance, often reviewed by attorneys | Public, per-state websites |

Import with `packages/api/seed/import-legal-aid-csv.ts` after compiling a
CSV from these directories for your target area(s) - like the facilities
layer, this isn't a live feed, so track and periodically re-verify entries.

**Get real legal review before publishing state-specific know-your-rights
content.** `packages/api/seed/seed-know-your-rights.ts` ships only generic,
widely-published federal constitutional-rights information (the "FEDERAL"
fallback) - it is not a substitute for state-specific content reviewed by a
local attorney, and it is not legal advice. See `docs/LEGAL.md`.
