import { JobModel } from "@/models/Job";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faUser,
  faEnvelope,
  faPhone,
  faArrowRight,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { WorkOS } from "@workos-inc/node";
import { getLogoUrl } from "@/lib/logoUtils";

type PageProps = {
  params: {
    jobId: string;
  };
};

export default async function SingleJobPage(props: PageProps) {
  const jobId = props.params.jobId;
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
  console.log("[show/[jobId]] orgName:", orgName, "(orgId:", jobDoc.orgId, ")");

  const logoUrl = getLogoUrl(orgName);

  return (
    <article className="container max-w-3xl py-12">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-8"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
        Back to jobs
      </Link>

      <header className="group flex items-start gap-5 mb-10">
        <div className="shrink-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]">
          {jobDoc.jobIcon ? (
            <Image
              src={jobDoc.jobIcon}
              alt={`${jobDoc.title} icon`}
              width={500}
              height={500}
              className="size-16 rounded-2xl object-cover ring-1 ring-gray-200"
            />
          ) : logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${orgName} logo`}
              width={128}
              height={128}
              className="size-16 rounded-2xl object-contain ring-1 ring-gray-200 bg-white"
            />
          ) : (
            <div className="size-16 rounded-2xl bg-swamp-50 ring-1 ring-swamp-100 flex items-center justify-center">
              <FontAwesomeIcon
                icon={faStar}
                className="text-swamp-500 text-xl"
              />
            </div>
          )}
        </div>
        <div className="grow">
          <h1 className="font-serif text-4xl sm:text-5xl text-gray-900 leading-tight opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:80ms]">
            {jobDoc.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-gray-500 capitalize opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:160ms]">
            <span>{jobDoc.remote}</span>
            <span aria-hidden>·</span>
            <span>
              {jobDoc.city}, {jobDoc.country}
            </span>
            <span aria-hidden>·</span>
            <span>{jobDoc.type}-time</span>
            {jobDoc.salary > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="text-swamp-600">${jobDoc.salary}k</span>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mb-10 card p-6 sm:flex items-center justify-between gap-4 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:240ms]">
        <div>
          <p className="font-serif text-xl text-gray-900">
            Ready to make a move?
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Submit your application in about 2 minutes.
          </p>
        </div>
        <Link
          href={`/show/${jobDoc._id}/apply`}
          className="btn-primary mt-4 sm:mt-0 shrink-0 group"
        >
          Apply for this role
          <FontAwesomeIcon
            icon={faArrowRight}
            className="size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="whitespace-pre-line text-gray-700 leading-relaxed opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:320ms]">
        {jobDoc.description}
      </div>

      <section className="mt-12 card p-6">
        <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-4">
          Apply by contacting
        </h2>
        <div className="flex items-start gap-4">
          {jobDoc.contactPhoto ? (
            <Image
              src={jobDoc.contactPhoto}
              alt="contact photo"
              width={500}
              height={500}
              className="size-16 rounded-2xl object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="size-16 rounded-2xl bg-swamp-50 ring-1 ring-swamp-100 flex items-center justify-center">
              <FontAwesomeIcon
                icon={faUser}
                className="text-swamp-500 text-xl"
              />
            </div>
          )}
          <div className="grow space-y-1.5">
            <p className="font-medium text-gray-900">{jobDoc.contactName}</p>
            <a
              href={`mailto:${jobDoc.contactEmail}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-swamp-600 transition-colors"
            >
              <FontAwesomeIcon icon={faEnvelope} className="size-3.5" />
              {jobDoc.contactEmail}
            </a>
            <a
              href={`tel:${jobDoc.contactPhone}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-swamp-600 transition-colors"
            >
              <FontAwesomeIcon icon={faPhone} className="size-3.5" />
              {jobDoc.contactPhone}
            </a>
          </div>
        </div>
      </section>
    </article>
  );
}
