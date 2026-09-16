import Link from "next/link";

export default function CaseNotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-sm font-semibold text-gray-500">
          404
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
          Case not found
        </h1>

        <p className="mt-4 text-sm leading-6 text-gray-600">
          This case may have been removed, may no longer be available, or the link may be incorrect.
        </p>

        <div className="mt-7 flex justify-center gap-3">
          <Link
            href="/cases"
            className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Browse cases
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}