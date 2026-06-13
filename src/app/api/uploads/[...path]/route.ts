import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Serve uploaded files dynamically from the filesystem.
// Next.js dev server doesn't serve files added to public/ after startup,
// so this API route handles serving user-uploaded images at runtime.

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filename = pathSegments.join("/");

  // Sanitize: prevent directory traversal
  if (filename.includes("..") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "public", "uploads", filename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filePath);

    // Determine MIME type from extension
    const ext = "." + filename.split(".").pop()?.toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error serving uploaded file:", err);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
