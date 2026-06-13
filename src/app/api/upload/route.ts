import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/auth";

// API route for file uploads. Server actions have body size limitations
// and iOS Safari blocks programmatic .click() on file inputs from non-direct
// user interactions, so using a standard form POST via fetch is more reliable.

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nincs bejelentkezve!" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nincs fájl kiválasztva!" }, { status: 400 });
    }

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "A feltöltött kép mérete nem lehet nagyobb 5MB-nál!" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique name
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${randomStr}-${sanitizedName}`;
    const filePath = join(uploadsDir, filename);

    // Write file
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/api/uploads/${filename}`,
    });
  } catch (err: any) {
    console.error("UPLOAD API ERROR:", err);
    return NextResponse.json(
      { error: "Sikertelen fájlfeltöltés!" },
      { status: 500 }
    );
  }
}
