import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const errorText = String(body.error || "Unknown error").slice(0, 1000);
    const source = String(body.source || "client").slice(0, 20);
    const url = body.url ? String(body.url).slice(0, 500) : null;
    const context = body.context || {};
    const userFid = body.fid ? parseInt(body.fid) : null;

    // Always log to Vercel function logs
    console.error(`[ClientError] [${source}] ${errorText}`, {
      url,
      fid: userFid,
      context,
    });

    // Best-effort DB insert — never fail the response
    try {
      const supabase = await createClient();
      await supabase.from("client_errors").insert({
        error_text: errorText,
        source,
        url,
        user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
        user_fid: isNaN(userFid as number) ? null : userFid,
        context,
      });
    } catch (dbErr) {
      console.error("[ClientError] DB insert failed:", dbErr);
    }
  } catch (err) {
    console.error("[ClientError] Handler error:", err);
  }

  // Always return ok — telemetry must never break the client
  return NextResponse.json({ ok: true });
}
