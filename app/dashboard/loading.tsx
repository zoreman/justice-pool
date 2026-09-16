export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-5 w-80 animate-pulse rounded bg-gray-100" />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-gray-200 p-5"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              <div className="mt-4 h-8 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>

        <div className="mt-12">
          <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />

          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200" />
                    <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-gray-100" />
                  </div>

                  <div className="h-8 w-24 animate-pulse rounded-full bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}