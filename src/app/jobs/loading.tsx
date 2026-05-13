export default function JobsLoading() {
  return (
    <section className="container py-10">
      <header className="mb-8">
        <div className="h-3 w-20 bg-gray-100 rounded motion-safe:animate-pulse" />
        <div className="mt-2 h-9 w-48 bg-gray-100 rounded motion-safe:animate-pulse" />
        <div className="mt-3 h-4 w-40 bg-gray-100 rounded motion-safe:animate-pulse" />
      </header>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <div className="card p-5 h-96 motion-safe:animate-pulse" />

        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="card p-5 flex gap-4 motion-safe:animate-pulse"
            >
              <div className="size-14 rounded-xl bg-gray-100 shrink-0" />
              <div className="grow space-y-2">
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-5 w-2/3 bg-gray-100 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
                <div className="pt-2 flex gap-2">
                  <div className="h-8 w-28 bg-gray-100 rounded-full" />
                  <div className="h-8 w-20 bg-gray-100 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
