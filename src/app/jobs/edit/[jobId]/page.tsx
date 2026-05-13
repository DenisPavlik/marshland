import JobForm from "@/app/components/JobForm";
import NoAccess from "@/app/components/NoAccess";
import { JobModel } from "@/models/Job";
import { getUser, getSignInUrl } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import mongoose from "mongoose";

type PageProps = {
  params: {
    jobId: string;
  }
}

export default async function EditJobPage(pageProps: PageProps) {
  const jobId = pageProps.params.jobId;
  await mongoose.connect(process.env.MONGO_URI as string);
  const jobDoc = JSON.parse(JSON.stringify(await JobModel.findById(jobId)));
  if (!jobDoc) {
    return <NoAccess text="Not found" />;
  }
  const { user } = await getUser();
  if (!user) {
    const signInUrl = await getSignInUrl();
    return (
      <NoAccess
        text="You need to login to edit this job."
        action={
          <Link href={signInUrl} className="btn-primary">
            Sign in
          </Link>
        }
      />
    );
  }
  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);
  const oms = await workos.userManagement.listOrganizationMemberships({
    userId: user.id,
    organizationId: jobDoc.orgId,
  });
  if (oms.data.length === 0) {
    return <NoAccess text="You don't have access to edit this job." />;
  }
  return (
    <div>
      <div className="container max-w-3xl pt-10">
        <Link
          href={`/jobs/${jobDoc.orgId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
          Back to company
        </Link>
      </div>
      <JobForm orgId={jobDoc.orgId} jobDoc={jobDoc} />
    </div>
  );
}
