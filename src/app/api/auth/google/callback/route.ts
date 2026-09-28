import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(
        new URL("/admin?error=no_code", request.url)
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/admin?error=no_refresh_token", request.url)
      );
    }

    const supabase = await createServiceClient();
    await supabase
      .from("settings")
      .upsert(
        {
          key: "google_refresh_token",
          value: tokens.refresh_token,
          description: "Google Drive OAuth2 refresh token",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    return NextResponse.redirect(
      new URL("/admin?google=connected", request.url)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/admin?error=oauth_failed", request.url)
    );
  }
}
