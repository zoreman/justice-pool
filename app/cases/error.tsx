"use client";

export default function CasesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl">
          !
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-gray-950">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          We couldn&apos;t load the cases right now. Please try again.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-gray-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Try again
        </button>
      </div>
    </main>
  );
}