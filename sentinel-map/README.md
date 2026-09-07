# Sentinel Map (scaffold)

A community transparency map of **public, fixed infrastructure** —
automatic license plate reader (ALPR) cameras and enforcement/government
facilities — plus **anonymous, area-based reports of enforcement activity**.

This project deliberately does **not** track, identify, or locate specific
individuals (on duty or off duty). See [`docs/LEGAL.md`](docs/LEGAL.md) for
why that line is drawn and kept.

## Layers

| Layer | What it is | How it's populated |
|---|---|---|
| **A — ALPR cameras** | Fixed/mobile license plate readers, multi-vendor (Flock, Motorola/Vigilant, Genetec, Rekor, Neology, ELSAG, Jenoptik, ...) | Bulk import from public datasets (DeFlock, EFF Atlas of Surveillance) + community submission |
| **B — Activity reports** | "Enforcement activity reported near X", decaying after a few hours, corroboration-weighted | Anonymous community submission only |
| **C — Facilities** | Police/sheriff stations, ICE field offices, detention facilities, immigration courts, CBP offices | Bulk import from public government directories (ICE locator, EOIR, TRAC, OSM) |

See [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) for exact sourcing per
layer, [`docs/MODERATION.md`](docs/MODERATION.md) for anti-abuse design, and
[`docs/SECURITY.md`](docs/SECURITY.md) for the application security posture
(what's hardened, what's mitigated, and what's intentionally not built
given this app has no accounts or sessions).

Alongside the map: a **know-your-rights** panel (state + language selector)
and a **legal aid directory** (nearest-first, plus statewide/national
hotlines), both reachable from the sidebar. Activity reports can also be
**flagged as inaccurate** from their map popup — a report hit repeatedly
is hidden pending review rather than deleted outright, and a moderator can
review every flagged report (not just hidden ones) at **`/admin`** — see
below for how to create an admin login.

## Structure

```
sentinel-map/
├── packages/
│   ├── api/     Express + TypeScript + Prisma backend
│   └── web/     Vite + React + MapLibre GL frontend
├── docs/
└── docker-compose.yml   Postgres (PostGIS-ready) for local dev
```

## Quickstart (local dev)

```bash
# 1. Database
cd sentinel-map
docker compose up -d

# 2. API
cd packages/api
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed:facilities:sample   # loads the sample/placeholder CSVs
npm run seed:legal-aid:sample    # loads the sample/placeholder legal aid CSV
npm run seed:kyr                 # loads the general know-your-rights content
npm run create-admin -- --username you --password 'a real passphrase, 12+ chars'
npm run dev                       # http://localhost:4000

# 3. Web
cd ../web
npm install
npm run dev                       # http://localhost:5173, moderation dashboard at /admin
```

## Status

Built: the three map layers, layer-toggle UI, community submission for
cameras and reports, corroboration merging, per-reporter rate limiting,
community flagging on reports, a know-your-rights panel (with an English/
Spanish federal-level entry seeded), a legal-aid directory, and a
login-gated `/admin` dashboard for reviewing and restoring/purging flagged
reports.

Not yet built: offline bundles, full multi-language coverage beyond the
know-your-rights panel, and per-action audit logging for admin actions
(see `docs/MODERATION.md`).

**Nothing in `seed/data/*.sample.csv` is real data.** Those files are
placeholders showing the expected column shape — replace them with actual
exports from the sources listed in `docs/DATA_SOURCES.md` before relying on
this for anything.
