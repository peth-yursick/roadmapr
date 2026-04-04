"use client";

/**
 * Fire-and-forget client error reporter.
 * Reports errors to /api/client-error — never blocks UI, never throws.
 */
export function reportClientError(
  error: string,
  context?: Record<string, unknown>
) {
  try {
    const fid =
      typeof document !== "undefined"
        ? document.cookie
            .split("; ")
            .find((c) => c.startsWith("user_fid="))
            ?.split("=")[1]
        : undefined;

    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error,
        source: "client",
        url: typeof window !== "undefined" ? window.location.href : undefined,
        fid,
        context,
      }),
    }).catch(() => {}); // Silent — never breaks the app
  } catch {
    // Telemetry must never throw
  }
}

/**
 * Install global error listeners (call once in layout/providers).
 * Captures unhandled errors and unhandled promise rejections.
 */
export function installGlobalErrorReporter() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    reportClientError(event.message || "Unhandled error", {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const msg =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    reportClientError(`Unhandled rejection: ${msg}`, {
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
    });
  });
}
