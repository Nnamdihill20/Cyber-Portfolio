/**
 * CSV importer for Layer A (ALPR cameras) - use this after exporting data
 * from DeFlock or the EFF Atlas of Surveillance to CSV.
 *
 * Expected CSV columns (header row required):
 *   latitude, longitude, vendor, mount_type, owner_type, owner_name, source_dataset, notes
 *
 * vendor must be one of the AlprVendor enum values (FLOCK, MOTOROLA_VIGILANT,
 * GENETEC, REKOR, NEOLOGY, ELSAG, JENOPTIK, COBAN, OTHER, UNKNOWN).
 * mount_type / owner_type are optional and may be left blank.
 *
 * Usage:
 *   ts-node seed/import-alpr-cameras-csv.ts --file path/to/export.csv --dataset deflock
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient, AlprVendor, MountType, OwnerType } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const file = getArg("file");
  const dataset = getArg("dataset") ?? "unknown";

  if (!file) {
    console.error(
      "Usage: ts-node seed/import-alpr-cameras-csv.ts --file <path.csv> [--dataset deflock|eff_atlas]"
    );
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

    const vendor: AlprVendor =
      row.vendor && row.vendor.toUpperCase() in AlprVendor
        ? (row.vendor.toUpperCase() as AlprVendor)
        : "UNKNOWN";
    const mountType =
      row.mount_type && row.mount_type.toUpperCase() in MountType
        ? (row.mount_type.toUpperCase() as MountType)
        : undefined;
    const ownerType =
      row.owner_type && row.owner_type.toUpperCase() in OwnerType
        ? (row.owner_type.toUpperCase() as OwnerType)
        : undefined;

    await prisma.alprCamera.create({
      data: {
        latitude: lat,
        longitude: lon,
        vendor,
        mountType,
        ownerType,
        ownerName: row.owner_name || undefined,
        notes: row.notes || undefined,
        source: `dataset_import:${dataset}`,
        sourceDataset: dataset,
        confidence: "VERIFIED",
        lastVerifiedAt: new Date(),
      },
    });
    imported++;
  }

  console.log(`Imported ${imported} ALPR cameras from ${csvPath} (dataset: ${dataset}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
