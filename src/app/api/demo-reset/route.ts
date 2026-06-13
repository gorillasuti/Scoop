import { NextResponse } from "next/server";
import { createSeedClient, wipeAllData, seedDemoData } from "../../../../prisma/seed-data";

/**
 * Demo Reset CRON endpoint.
 * Wipes all data and re-seeds the demo database.
 *
 * Secured via Vercel's CRON_SECRET (automatically verified) or
 * a manual `?secret=` query param for testing.
 */
export async function GET(request: Request) {
  // Only allow in demo mode
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Not in demo mode" }, { status: 403 });
  }

  // Verify authorization
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    // Vercel Cron sends the secret as an Authorization header
    const authHeader = request.headers.get("authorization");
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");

    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isManualTrigger = querySecret === cronSecret;

    if (!isVercelCron && !isManualTrigger) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const prisma = createSeedClient();

  try {
    console.log("[DEMO RESET] Starting database reset...");

    await wipeAllData(prisma);
    console.log("[DEMO RESET] All data wiped.");

    const result = await seedDemoData(prisma);
    console.log(
      `[DEMO RESET] Re-seeded: ${result.recipeCount} recipes for ${result.user.email}`
    );

    return NextResponse.json({
      success: true,
      resetAt: new Date().toISOString(),
      recipesSeeded: result.recipeCount,
    });
  } catch (error: any) {
    console.error("[DEMO RESET] Failed:", error);
    return NextResponse.json(
      { error: "Reset failed", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
