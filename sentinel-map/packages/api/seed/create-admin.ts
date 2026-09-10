/**
 * Provisions (or updates the password of) an admin/moderator account.
 * There is deliberately no public signup endpoint - admin accounts are
 * created out-of-band by whoever operates this deployment, via this script.
 *
 * Usage:
 *   ts-node seed/create-admin.ts --username alice --password 'a real passphrase'
 *
 * Re-running with the same --username updates that user's password instead
 * of erroring, so this also works as a "reset the admin password" tool.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/adminAuth";

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const username = getArg("username");
  const password = getArg("password");

  if (!username || !password) {
    console.error(
      "Usage: ts-node seed/create-admin.ts --username <name> --password <passphrase>"
    );
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  console.log(`Admin user "${user.username}" is ready.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
