export default function CasesLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="h-10 w-56 animate-pulse rounded bg-gray-200" />

        <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded bg-gray-100" />

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-gray-200 p-6"
            >
              <div className="flex gap-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-gray-200" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
              </div>

              <div className="mt-5 h-7 w-3/4 animate-pulse rounded bg-gray-200" />

              <div className="mt-4 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
              </div>

              <div className="mt-7 h-2 w-full animate-pulse rounded-full bg-gray-200" />

              <div className="mt-5 flex justify-between">
                <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
              </div>

              <div className="mt-6 h-11 w-full animate-pulse rounded-xl bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}