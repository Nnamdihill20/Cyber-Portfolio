/**
 * CSV importer for legal aid / immigration hotline organizations.
 *
 * Expected CSV columns (header row required):
 *   name, latitude, longitude, phone, website, languages, specialty, hours, notes
 *
 * latitude/longitude may be left blank for a statewide or national hotline -
 * it will be shown regardless of the viewer's location (see
 * routes/legalAid.ts). languages is a "|"-separated list, e.g. "en|es".
 *
 * Usage:
 *   ts-node seed/import-legal-aid-csv.ts --file seed/data/legal_aid.sample.csv
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const file = getArg("file");
  if (!file) {
    console.error("Usage: ts-node seed/import-legal-aid-csv.ts --file <path.csv>");
    process.exit(1);
  }

  const csvPath = path.resolve(file);
  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  let imported = 0;
  for (const row of rows) {
    const hasLat = row.latitude !== undefined && row.latitude !== "";
    const hasLon = row.longitude !== undefined && row.longitude !== "";
    const latitude = hasLat ? Number(row.latitude) : null;
    const longitude = hasLon ? Number(row.longitude) : null;
    if ((hasLat || hasLon) && (Number.isNaN(latitude) || Number.isNaN(longitude))) {
      console.warn(`Skipping row with bad coordinates: ${JSON.stringify(row)}`);
      continue;
    }

    await prisma.legalAidOrg.create({
      data: {
        name: row.name,
        latitude,
        longitude,
        phone: row.phone || undefined,
        website: row.website || undefined,
        languages: row.languages ? row.languages.split("|").map((l) => l.trim()) : [],
        specialty: row.specialty || undefined,
        hours: row.hours || undefined,
        notes: row.notes || undefined,
        source: path.basename(csvPath),
      },
    });
    imported++;
  }

  console.log(`Imported ${imported} legal aid orgs from ${csvPath}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
