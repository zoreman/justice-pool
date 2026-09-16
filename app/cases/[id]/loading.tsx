export default function CaseLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Back link skeleton */}
        <div className="mb-8 h-5 w-28 animate-pulse rounded bg-gray-200" />

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Main content */}
          <div>
            <div className="mb-4 flex gap-3">
              <div className="h-7 w-28 animate-pulse rounded-full bg-gray-200" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-gray-200" />
            </div>

            <div className="h-11 w-3/4 animate-pulse rounded bg-gray-200" />

            <div className="mt-5 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
            </div>

            <div className="mt-10 h-px bg-gray-200" />

            <div className="mt-10">
              <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />

              <div className="mt-5 space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              </div>
            </div>

            <div className="mt-12">
              <div className="h-7 w-32 animate-pulse rounded bg-gray-200" />

              <div className="mt-6 space-y-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-gray-200 p-5"
                  >
                    <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200" />
                    <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside>
            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <div className="h-8 w-36 animate-pulse rounded bg-gray-200" />

              <div className="mt-6 h-3 w-full animate-pulse rounded-full bg-gray-200" />

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
              </div>

              <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-gray-200" />
              <div className="mt-3 h-12 w-full animate-pulse rounded-xl bg-gray-100" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}