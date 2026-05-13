import { getUser } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";
import { JobModel } from "@/models/Job";
import { ApplicationModel } from "@/models/Application";
import mongoose from "mongoose";
import Link from "next/link";
import NoAccess from "@/app/components/NoAccess";
import { notFound } from "next/navigation";
import TimeAgo from "@/app/components/TimeAgo";
import MarkReviewedButton from "./MarkReviewedButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faEnvelope,
  faPhone,
  faFilePdf,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";

const YEARS_LABEL: Record<string, string> = {
  "<1": "Less than 1 year",
  "1-2": "1–2 years",
  "3-5": "3–5 years",
  "5-10": "5–10 years",
  "10+": "10+ years",
};

const YES_NO_LABEL: Record<string, string> = {
  yes: "Yes",
  no: "No",
};

const YES_NO_DECLINE_LABEL: Record<string, string> = {
  yes: "Yes",
  no: "No",
  decline: "Declined to self-identify",
};

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  decline: "Declined to self-identify",
};

type PageProps = {
  params: { orgId: string; jobId: string; applicationId: string };
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-3">
      {children}
    </p>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 text-right">{value}</dd>
    </div>
  );
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { user } = await getUser();
  if (!user) {
    return <NoAccess text="You need to be logged in." />;
  }

  if (
    !mongoose.isValidObjectId(params.applicationId) ||
    !mongoose.isValidObjectId(params.jobId)
  ) {
    notFound();
  }

  await mongoose.connect(process.env.MONGO_URI as string);
  const app = await ApplicationModel.findById(params.applicationId);
  if (!app || String(app.jobId) !== params.jobId) {
    notFound();
  }

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

  return (
    <section className="container max-w-3xl py-12">
      <Link
        href={`/jobs/${params.orgId}/applications/${params.jobId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-6 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
        Back to applications
      </Link>

      <header className="flex items-start gap-5 mb-10 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:150ms]">
        <div className="size-14 shrink-0 rounded-2xl bg-swamp-50 ring-1 ring-swamp-100 flex items-center justify-center font-mono text-xl text-swamp-700 font-medium">
          {app.fullName?.slice(0, 1).toUpperCase() || "?"}
        </div>
        <div className="grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-3xl text-gray-900 leading-tight">
              {app.fullName}
            </h1>
            {app.status === "new" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider text-swamp-700 bg-swamp-100 ring-1 ring-swamp-200">
                New
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-gray-500">
            Applied for <span className="text-gray-700">{job.title}</span>{" "}
            &middot; <TimeAgo createdAt={app.createdAt} />
          </p>
        </div>
        <div className="shrink-0">
          <MarkReviewedButton
            applicationId={String(app._id)}
            status={app.status}
          />
        </div>
      </header>

      <div className="space-y-8">
        <section className="card p-6 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:250ms]">
          <SectionLabel>Contact applicant</SectionLabel>
          <div className="space-y-2">
            <a
              href={`mailto:${app.email}`}
              className="inline-flex items-center gap-3 text-gray-900 hover:text-swamp-600 transition-colors"
            >
              <FontAwesomeIcon
                icon={faEnvelope}
                className="size-4 text-gray-400"
              />
              {app.email}
            </a>
            <br />
            <a
              href={`tel:${app.phone}`}
              className="inline-flex items-center gap-3 text-gray-900 hover:text-swamp-600 transition-colors"
            >
              <FontAwesomeIcon
                icon={faPhone}
                className="size-4 text-gray-400"
              />
              {app.phone}
            </a>
          </div>
        </section>

        <section className="card p-6 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:350ms]">
          <SectionLabel>Resume</SectionLabel>
          <a
            href={`/api/applications/${String(app._id)}/resume`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-swamp-50 ring-1 ring-swamp-100 hover:ring-swamp-300 hover:bg-swamp-100/60 transition-colors group"
          >
            <FontAwesomeIcon
              icon={faFilePdf}
              className="text-swamp-500 text-xl"
            />
            <span className="grow text-gray-900 font-medium">
              Download PDF
            </span>
            <FontAwesomeIcon
              icon={faDownload}
              className="size-3.5 text-gray-400 group-hover:text-swamp-600 transition-colors"
            />
          </a>
        </section>

        <section className="card p-6 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:450ms]">
          <SectionLabel>Profile</SectionLabel>
          <dl>
            <Field
              label="LinkedIn"
              value={
                app.linkedinUrl ? (
                  <a
                    href={app.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-swamp-600 hover:text-swamp-700 transition-colors"
                  >
                    <FontAwesomeIcon icon={faLinkedin} className="size-3.5" />
                    View profile
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                )
              }
            />
            <Field
              label="Right to work"
              value={YES_NO_LABEL[app.workAuthorization] || app.workAuthorization}
            />
            <Field
              label="Years of experience"
              value={
                YEARS_LABEL[app.yearsOfExperience] || app.yearsOfExperience
              }
            />
          </dl>
        </section>

        <section className="card p-6 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:550ms]">
          <SectionLabel>Why they want to work here</SectionLabel>
          <blockquote className="text-gray-700 leading-relaxed whitespace-pre-line border-l-2 border-swamp-300 pl-4 italic">
            {app.whyJoin}
          </blockquote>
        </section>

        <section className="card p-6 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:650ms]">
          <SectionLabel>Voluntary disclosures</SectionLabel>
          <dl>
            <Field
              label="Gender"
              value={GENDER_LABEL[app.gender] || app.gender}
            />
            <Field
              label="Veteran status"
              value={
                YES_NO_DECLINE_LABEL[app.veteranStatus] || app.veteranStatus
              }
            />
            <Field
              label="Disability status"
              value={
                YES_NO_DECLINE_LABEL[app.disabilityStatus] ||
                app.disabilityStatus
              }
            />
          </dl>
        </section>
      </div>
    </section>
  );
}
