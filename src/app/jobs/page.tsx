import mongoose from "mongoose";
import { Suspense } from "react";
import { JobModel } from "@/models/Job";
import { addOrgAndUserData } from "@/app/actions/jobActions";
import JobRow from "@/app/components/JobRow";
import FiltersAside from "@/app/components/FiltersAside";
import { getUser } from "@workos-inc/authkit-nextjs";

type SearchParams = {
  q?: string;
  remote?: string | string[];
  type?: string | string[];
  salaryMin?: string;
  salaryMax?: string;
};

type PageProps = {
  searchParams?: SearchParams;
};

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function JobsPage({ searchParams }: PageProps) {
  const { user } = await getUser();
  await mongoose.connect(process.env.MONGO_URI as string);

  const q = searchParams?.q?.trim() ?? "";
  const remote = asArray(searchParams?.remote);
  const type = asArray(searchParams?.type);
  const salaryMinRaw = searchParams?.salaryMin?.toString().trim() ?? "";
  const salaryMaxRaw = searchParams?.salaryMax?.toString().trim() ?? "";
  const salaryMin = salaryMinRaw ? Number(salaryMinRaw) : undefined;
  const salaryMax = salaryMaxRaw ? Number(salaryMaxRaw) : undefined;

  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { title: { $regex: escapeRegex(q), $options: "i" } },
      { description: { $regex: escapeRegex(q), $options: "i" } },
    ];
  }
  if (remote.length) filter.remote = { $in: remote };
  if (type.length) filter.type = { $in: type };
  if (
    (salaryMin !== undefined && !Number.isNaN(salaryMin)) ||
    (salaryMax !== undefined && !Number.isNaN(salaryMax))
  ) {
    const salaryFilter: Record<string, number> = {};
    if (salaryMin !== undefined && !Number.isNaN(salaryMin)) {
      salaryFilter.$gte = salaryMin;
    }
    if (salaryMax !== undefined && !Number.isNaN(salaryMax)) {
      salaryFilter.$lte = salaryMax;
    }
    filter.salary = salaryFilter;
  }

  const jobs = await addOrgAndUserData(
    await JobModel.find(filter, {}, { sort: "-createdAt" }),
    user
  );

  const hasFilters =
    !!q ||
    remote.length > 0 ||
    type.length > 0 ||
    salaryMin !== undefined ||
    salaryMax !== undefined;

  return (
    <section className="container py-10">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-gray-400">
          Job board
        </p>
        <h1 className="mt-1 font-serif text-4xl text-gray-900">All roles</h1>
        <p className="mt-2 text-gray-500">
          {jobs.length} {jobs.length === 1 ? "role" : "roles"}
          {hasFilters ? " matching your filters" : " available"}
        </p>
      </header>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <Suspense
          fallback={
            <aside className="card p-5 h-96 motion-safe:animate-pulse" />
          }
        >
          <FiltersAside />
        </Suspense>

        <main>
          {jobs.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="font-serif text-2xl text-gray-700 mb-2">
                Nothing here yet.
              </p>
              <p className="text-sm text-gray-500">
                {hasFilters
                  ? "Try widening your filters."
                  : "Check back later — new roles are posted often."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {jobs.map((job: any, i: number) => (
                <div
                  key={job._id}
                  className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  <JobRow jobDoc={job} />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
