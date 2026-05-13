import { getUser } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";
import { JobModel } from "@/models/Job";
import { ApplicationModel } from "@/models/Application";
import mongoose from "mongoose";
import Link from "next/link";
import NoAccess from "@/app/components/NoAccess";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

type PageProps = {
  params: { orgId: string };
};

type CountRow = { _id: string; total: number; newCount: number };

export default async function OrgApplicationsPage({ params }: PageProps) {
  const { user } = await getUser();
  if (!user) {
    return <NoAccess text="You need to be logged in to view applications." />;
  }

  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);
  const oms = await workos.userManagement.listOrganizationMemberships({
    userId: user.id,
    organizationId: params.orgId,
  });
  if (oms.data.length === 0) {
    return (
      <NoAccess text="You don't have access to this company's applications." />
    );
  }

  let org;
  try {
    org = await workos.organizations.getOrganization(params.orgId);
  } catch {
    notFound();
  }

  await mongoose.connect(process.env.MONGO_URI as string);
  const jobs = await JobModel.find(
    { orgId: params.orgId },
    {},
    { sort: "-createdAt" }
  );

  const jobIds = jobs.map((j: any) => String(j._id));
  const counts: CountRow[] = await ApplicationModel.aggregate([
    { $match: { jobId: { $in: jobIds } } },
    {
      $group: {
        _id: "$jobId",
        total: { $sum: 1 },
        newCount: {
          $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] },
        },
      },
    },
  ]);
  const countMap = new Map<string, { total: number; newCount: number }>(
    counts.map((c) => [c._id, { total: c.total, newCount: c.newCount }])
  );

  return (
    <section className="container max-w-3xl py-12">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-gray-400 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]">
          Applications inbox
        </p>
        <h1 className="mt-1 font-serif text-4xl text-gray-900 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:150ms]">
          {org.name}
        </h1>
        <p className="mt-2 text-gray-500 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:250ms]">
          Pick a job to see the candidates who&apos;ve applied.
        </p>
      </header>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:300ms]">
          <p className="font-serif text-2xl text-gray-700 mb-1">
            No jobs yet.
          </p>
          <p className="text-sm text-gray-500">
            Post your first role to start receiving applications.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job: any, i: number) => {
            const count = countMap.get(String(job._id));
            const total = count?.total || 0;
            const newCount = count?.newCount || 0;
            return (
              <li
                key={String(job._id)}
                className="opacity-0 motion-safe:animate-fade-up-sm motion-reduce:opacity-100"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              >
                <Link
                  href={`/jobs/${params.orgId}/applications/${job._id}`}
                  className="card p-5 flex items-center justify-between gap-4 hover:shadow-card-hover hover:ring-swamp-200 group"
                >
                  <div className="grow min-w-0">
                    <h2 className="font-serif text-xl text-gray-900 leading-tight">
                      {job.title}
                    </h2>
                    <p className="mt-1 font-mono text-xs uppercase tracking-wider text-gray-500 capitalize">
                      {job.city}, {job.country} &middot; {job.remote}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    {newCount > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full font-mono text-xs text-swamp-700 bg-swamp-100 ring-1 ring-swamp-200">
                        {newCount} new
                      </span>
                    )}
                    <span className="font-mono text-sm text-gray-500 tabular-nums">
                      {total}
                    </span>
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="size-3.5 text-gray-300 group-hover:text-swamp-500 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
