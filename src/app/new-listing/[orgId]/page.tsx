import JobForm from "@/app/components/JobForm";
import NoAccess from "@/app/components/NoAccess";
import { getUser, getSignInUrl } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

type PageProps = {
  params: {
    orgId: string;
  };
};

export default async function NewListingForOrgPage(props: PageProps) {
  const { user } = await getUser();
  if (!user) {
    const signInUrl = await getSignInUrl();
    return (
      <NoAccess
        text="You need to be logged in to post a job."
        action={
          <Link href={signInUrl} className="btn-primary">
            Sign in
          </Link>
        }
      />
    );
  }
  const workos = new WorkOS(process.env.WORKOS_API_KEY);
  const orgId = props.params.orgId;
  const oms = await workos.userManagement.listOrganizationMemberships({
    userId: user.id,
    organizationId: orgId,
  });
  if (oms.data.length === 0) {
    return (
      <NoAccess text="You don't have access to post jobs for this company." />
    );
  }

  return (
    <div>
      <div className="container max-w-3xl pt-10">
        <Link
          href="/new-listing"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
          Pick another company
        </Link>
      </div>
      <JobForm orgId={orgId} />
    </div>
  );
}
