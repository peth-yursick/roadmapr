import { createClient } from "./server";

export type SupabaseHealthStatus = "ok" | "paused" | "error";

export interface HealthCheckResult {
  status: SupabaseHealthStatus;
  message?: string;
}

const PAUSED_INDICATORS = [
  "project is paused",
  "pg_isready",
  "connection refused",
  "ECONNREFUSED",
  "timeout",
  "fetch failed",
  "terminated",
  "Connection terminated",
  "SSL connection has been closed",
];

export function isSupabasePaused(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

  return PAUSED_INDICATORS.some((indicator) =>
    msg.toLowerCase().includes(indicator.toLowerCase())
  );
}

export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  try {
    const supabase = await createClient();
    // Lightweight query — just check if we can reach the DB
    const { error } = await supabase
      .from("projects")
      .select("id")
      .limit(1);

    if (error) {
      if (isSupabasePaused(error)) {
        return {
          status: "paused",
          message:
            "Database is paused due to inactivity. Visit the Supabase dashboard to resume it.",
        };
      }
      return { status: "error", message: error.message };
    }

    return { status: "ok" };
  } catch (err) {
    if (isSupabasePaused(err)) {
      return {
        status: "paused",
        message:
          "Database is paused due to inactivity. Visit the Supabase dashboard to resume it.",
      };
    }
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
