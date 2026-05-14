import { JobModel } from "@/models/Job";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { WorkOS } from "@workos-inc/node";
import { getLogoUrl } from "@/lib/logoUtils";
import ApplyForm from "./ApplyForm";

type PageProps = {
  params: { jobId: string };
};

export default async function ApplyPage({ params }: PageProps) {
  const { jobId } = params;
  await mongoose.connect(process.env.MONGO_URI as string);
  if (!mongoose.isValidObjectId(jobId)) {
    notFound();
  }
  const jobDoc = await JobModel.findById(jobId);
  if (!jobDoc) {
    notFound();
  }

  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);
  const org = await workos.organizations.getOrganization(jobDoc.orgId);
  const orgName = org.name;
  const logoUrl = getLogoUrl(orgName);

  const descriptionPreview =
    jobDoc.description?.length > 240
      ? jobDoc.description.slice(0, 240).trim() + "…"
      : jobDoc.description;

  return (
    <div className="container py-10">
      <Link
        href={`/show/${jobId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-8"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
        Back to job
      </Link>

      <div className="grid lg:grid-cols-[340px_1fr] gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="shrink-0">
                {jobDoc.jobIcon ? (
                  <Image
                    src={jobDoc.jobIcon}
                    alt={`${jobDoc.title} icon`}
                    width={500}
                    height={500}
                    className="size-12 rounded-xl object-cover ring-1 ring-gray-200"
                  />
                ) : logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={`${orgName} logo`}
                    width={128}
                    height={128}
                    className="size-12 rounded-xl object-contain ring-1 ring-gray-200 bg-white"
                  />
                ) : (
                  <div className="size-12 rounded-xl bg-swamp-50 ring-1 ring-swamp-100 flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faStar}
                      className="text-swamp-500"
                    />
                  </div>
                )}
              </div>
              <div className="grow min-w-0">
                <h2 className="font-serif text-xl text-gray-900 leading-tight">
                  {jobDoc.title}
                </h2>
                <p className="mt-1 font-mono text-xs uppercase tracking-wider text-gray-500">
                  {orgName}
                </p>
              </div>
            </div>

            <dl className="space-y-3 text-sm border-t border-gray-200 pt-5">
              <div className="flex justify-between gap-3">
                <dt className="font-mono text-xs uppercase tracking-wider text-gray-400">
                  Location
                </dt>
                <dd className="text-gray-700 text-right">
                  {jobDoc.city}, {jobDoc.country}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-mono text-xs uppercase tracking-wider text-gray-400">
                  Mode
                </dt>
                <dd className="text-gray-700 capitalize">{jobDoc.remote}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-mono text-xs uppercase tracking-wider text-gray-400">
                  Type
                </dt>
                <dd className="text-gray-700 capitalize">
                  {jobDoc.type}-time
                </dd>
              </div>
              {jobDoc.salary > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="font-mono text-xs uppercase tracking-wider text-gray-400">
                    Salary
                  </dt>
                  <dd className="text-swamp-600 font-mono">
                    ${jobDoc.salary}k
                  </dd>
                </div>
              )}
            </dl>

            {descriptionPreview && (
              <p className="mt-5 pt-5 border-t border-gray-200 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {descriptionPreview}
              </p>
            )}
          </div>
        </aside>

        <main>
          <header className="mb-8">
            <h1 className="font-serif text-4xl text-gray-900 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]">
              Apply for this role
            </h1>
            <p className="mt-2 text-gray-500 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:140ms]">
              Tell us a bit about yourself. It takes about 2 minutes.
            </p>
          </header>

          <ApplyForm jobId={jobId} />
        </main>
      </div>
    </div>
  );
}
