/**
 * CLI entry point for `npx prisma db seed`.
 * Wipes the database and seeds it with demo data.
 */

import { createSeedClient, wipeAllData, seedDemoData } from "./seed-data";

async function main() {
  const prisma = createSeedClient();

  try {
    console.log("🗑️  Wiping all existing data...");
    await wipeAllData(prisma);
    console.log("✅ Database wiped.");

    console.log("🌱 Seeding demo data...");
    const result = await seedDemoData(prisma);
    console.log(
      `✅ Seeded: 1 demo user (${result.user.email}) + ${result.recipeCount} recipes.`
    );
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
