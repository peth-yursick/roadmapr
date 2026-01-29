"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-gray-500 mt-1">{error.message}</p>
            <button
              onClick={reset}
              className="mt-4 px-4 py-2 bg-black text-white rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
