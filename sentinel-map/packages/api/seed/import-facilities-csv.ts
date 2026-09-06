/**
 * Generic CSV importer for Layer C (facilities) - ICE field offices, EOIR
 * immigration courts, TRAC/Freedom for Immigrants detention facilities, etc.
 *
 * Expected CSV columns (header row required):
 *   name, latitude, longitude, jurisdiction, address, phone, operating_hours, notes
 *
 * jurisdiction must be one of: FEDERAL, STATE, COUNTY, MUNICIPAL
 *
 * Usage:
 *   ts-node seed/import-facilities-csv.ts --type ICE_FIELD_OFFICE --file seed/data/ice_field_offices.sample.csv
 *
 * --type must be one of the FacilityType enum values in prisma/schema.prisma.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient, FacilityType, Jurisdiction } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const type = getArg("type");
  const file = getArg("file");

  if (!type || !file) {
    console.error(
      "Usage: ts-node seed/import-facilities-csv.ts --type <FacilityType> --file <path.csv>"
    );
    process.exit(1);
  }
  if (!(type in FacilityType)) {
    console.error(`Unknown facility type "${type}". Valid: ${Object.keys(FacilityType).join(", ")}`);
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
    const lat = Number(row.latitude);
    const lon = Number(row.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      console.warn(`Skipping row with bad coordinates: ${JSON.stringify(row)}`);
      continue;
    }
    const jurisdiction = row.jurisdiction as Jurisdiction;
    if (!(jurisdiction in Jurisdiction)) {
      console.warn(`Skipping row with bad jurisdiction "${row.jurisdiction}"`);
      continue;
    }

    await prisma.facility.create({
      data: {
        name: row.name,
        latitude: lat,
        longitude: lon,
        type: type as FacilityType,
        jurisdiction,
        address: row.address || undefined,
        phone: row.phone || undefined,
        operatingHours: row.operating_hours || undefined,
        notes: row.notes || undefined,
        source: path.basename(csvPath),
      },
    });
    imported++;
  }

  console.log(`Imported ${imported} ${type} facilities from ${csvPath}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
