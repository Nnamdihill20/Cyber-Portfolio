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
layer, and [`docs/MODERATION.md`](docs/MODERATION.md) for anti-abuse design.

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
npm run dev                       # http://localhost:4000

# 3. Web
cd ../web
npm install
npm run dev                       # http://localhost:5173
```

## Status

This is an initial scaffold: schema, API routes, seed-import scripts, and a
working map UI with layer toggles. Not yet built: submission moderation UI,
know-your-rights content, legal-aid directory, offline bundles, and
multi-language support — see the roadmap in the project plan for sequencing.

**Nothing in `seed/data/*.sample.csv` is real data.** Those files are
placeholders showing the expected column shape — replace them with actual
exports from the sources listed in `docs/DATA_SOURCES.md` before relying on
this for anything.
