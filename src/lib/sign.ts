import { createHmac, timingSafeEqual } from "crypto";

function key() {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY || "atlas")
    .update("atlas-thumbnail-v1")
    .digest();
}

function signature(fileId: string, exp: number) {
  return createHmac("sha256", key()).update(`${fileId}:${exp}`).digest("base64url").slice(0, 32);
}

/**
 * Thumbnail URLs are authorised when the listing is built, so the image route only has to
 * verify the signature. Expiry is rounded to the hour to keep URLs stable for browser caching.
 */
export function thumbnailUrl(fileId: string) {
  const exp = (Math.floor(Date.now() / 3_600_000) + 2) * 3600;
  return `/api/drive/thumbnail?id=${encodeURIComponent(fileId)}&exp=${exp}&sig=${signature(fileId, exp)}`;
}

export function verifyThumbnail(fileId: string, exp: number, sig: string) {
  if (!fileId || !Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = Buffer.from(signature(fileId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
