import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Page not found</h2>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to feed
        </Link>
      </div>
    </div>
  );
}
