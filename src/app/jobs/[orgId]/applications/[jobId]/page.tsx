import { getUser } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";
import { JobModel } from "@/models/Job";
import { ApplicationModel } from "@/models/Application";
import mongoose from "mongoose";
import Link from "next/link";
import NoAccess from "@/app/components/NoAccess";
import { notFound } from "next/navigation";
import TimeAgo from "@/app/components/TimeAgo";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";

const YEARS_LABEL: Record<string, string> = {
  "<1": "<1 yr",
  "1-2": "1–2 yrs",
  "3-5": "3–5 yrs",
  "5-10": "5–10 yrs",
  "10+": "10+ yrs",
};

type PageProps = {
  params: { orgId: string; jobId: string };
};

export default async function JobApplicationsPage({ params }: PageProps) {
  const { user } = await getUser();
  if (!user) {
    return <NoAccess text="You need to be logged in." />;
  }

  if (!mongoose.isValidObjectId(params.jobId)) {
    notFound();
  }

  await mongoose.connect(process.env.MONGO_URI as string);
  const job = await JobModel.findById(params.jobId);
  if (!job || job.orgId !== params.orgId) {
    notFound();
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

  const apps = JSON.parse(
    JSON.stringify(
      await ApplicationModel.find(
        { jobId: params.jobId },
        {},
        { sort: "-createdAt" }
      )
    )
  );

  return (
    <section className="container max-w-4xl py-12">
      <Link
        href={`/jobs/${params.orgId}/applications`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-6 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
        All jobs
      </Link>

      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-gray-400 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:100ms]">
          Applications for
        </p>
        <h1 className="mt-1 font-serif text-4xl text-gray-900 leading-tight opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:200ms]">
          {job.title}
        </h1>
        <p className="mt-2 text-gray-500 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:300ms]">
          {apps.length} {apps.length === 1 ? "application" : "applications"}{" "}
          received
        </p>
      </header>

      {apps.length === 0 ? (
        <div className="card p-12 text-center opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:350ms]">
          <p className="font-serif text-2xl text-gray-700 mb-1">
            No applications yet.
          </p>
          <p className="text-sm text-gray-500">
            Once candidates apply, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {apps.map((app: any, i: number) => (
            <li
              key={app._id}
              className="opacity-0 motion-safe:animate-fade-up-sm motion-reduce:opacity-100"
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
            >
              <Link
                href={`/jobs/${params.orgId}/applications/${params.jobId}/${app._id}`}
                className="card p-5 flex items-center gap-4 hover:shadow-card-hover hover:ring-swamp-200 group"
              >
                <div className="size-11 shrink-0 rounded-xl bg-swamp-50 ring-1 ring-swamp-100 flex items-center justify-center font-mono text-sm text-swamp-700 font-medium">
                  {app.fullName?.slice(0, 1).toUpperCase() || "?"}
                </div>
                <div className="grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">
                      {app.fullName}
                    </h3>
                    {app.status === "new" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider text-swamp-700 bg-swamp-100 ring-1 ring-swamp-200">
                        New
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-100 ring-1 ring-gray-200">
                        Reviewed
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-gray-500 truncate">
                    {app.email} &middot;{" "}
                    {YEARS_LABEL[app.yearsOfExperience] || app.yearsOfExperience}
                  </p>
                </div>
                <div className="shrink-0 hidden sm:block font-mono text-xs text-gray-400">
                  <TimeAgo createdAt={app.createdAt} />
                </div>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="size-3.5 text-gray-300 group-hover:text-swamp-500 group-hover:translate-x-0.5 transition-all"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
