import type { Job } from "@/models/Job";
import JobRow from "./JobRow";

export default function Jobs({
  header,
  jobs,
}: {
  header: string;
  jobs: Job[];
}) {
  return (
    <section id="jobs" className="container pb-16 scroll-mt-24">
      <div className="flex items-end justify-between mb-8">
        <h2 className="font-serif text-3xl text-gray-900">
          {header || "Recent jobs"}
        </h2>
        {jobs?.length > 0 && (
          <span className="font-mono text-xs text-gray-400">
            {jobs.length} {jobs.length === 1 ? "result" : "results"}
          </span>
        )}
      </div>

      {!jobs?.length && (
        <div className="card p-12 text-center">
          <p className="font-serif text-2xl text-gray-700 mb-2">
            Nothing here yet.
          </p>
          <p className="text-sm text-gray-500">
            Try a different search, or check back later.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {jobs?.map((job, i) => (
          <div
            key={job._id}
            className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100"
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <JobRow jobDoc={job} />
          </div>
        ))}
      </div>
    </section>
  );
}
