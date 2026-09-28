import { NextRequest } from "next/server";
import { getThumbnail } from "@/lib/google-drive";
import { verifyThumbnail } from "@/lib/sign";

const SIZES = [220, 480, 1024, 1600];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = params.get("id") || "";
  if (!verifyThumbnail(id, Number(params.get("exp")), params.get("sig") || "")) {
    return new Response(null, { status: 403 });
  }

  const requested = Number(params.get("s")) || 480;
  const size = SIZES.find((s) => s >= requested) ?? SIZES[SIZES.length - 1];

  try {
    const thumb = await getThumbnail(id, size);
    if (!thumb) return new Response(null, { status: 404 });
    return new Response(thumb.body, {
      headers: {
        "Content-Type": thumb.contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
