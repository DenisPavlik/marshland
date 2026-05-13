export default function CompanyJobsLoading() {
  return (
    <div className="pt-12">
      <header className="container mb-10">
        <div className="h-3 w-20 bg-gray-200 rounded motion-safe:animate-pulse" />
        <div className="mt-2 h-9 w-64 bg-gray-200 rounded motion-safe:animate-pulse" />
      </header>

      <section className="container pb-16">
        <div className="flex items-end justify-between mb-8">
          <div className="h-8 w-56 bg-gray-200 rounded motion-safe:animate-pulse" />
          <div className="h-3 w-16 bg-gray-200 rounded motion-safe:animate-pulse" />
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="card p-5 flex gap-4 ring-gray-300 motion-safe:animate-pulse"
            >
              <div className="size-14 rounded-xl bg-gray-200 shrink-0" />
              <div className="grow space-y-2">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-5 w-2/3 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
