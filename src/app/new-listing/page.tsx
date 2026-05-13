import { faArrowRight, faPlus, faBuilding } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getUser, getSignInUrl } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";
import Link from "next/link";
import NoAccess from "../components/NoAccess";

export default async function NewListingPage() {
  const { user } = await getUser();
  if (!user) {
    const signInUrl = await getSignInUrl();
    return (
      <NoAccess
        text="You need to be logged in to post a job!"
        action={
          <Link href={signInUrl} className="btn-primary">
            Sign in
          </Link>
        }
      />
    );
  }

  const workos = new WorkOS(process.env.WORKOS_API_KEY);

  const organizationMemberships =
    await workos.userManagement.listOrganizationMemberships({
      userId: user.id,
    });

  const activeOrganizationMemberships = organizationMemberships.data.filter(
    (om) => om.status === "active"
  );
  const organizations = await Promise.all(
    activeOrganizationMemberships.map((om) =>
      workos.organizations.getOrganization(om.organizationId)
    )
  );

  return (
    <section className="container max-w-3xl py-16">
      <header className="mb-10 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]">
        <h1 className="font-serif text-4xl text-gray-900">Post a role</h1>
        <p className="mt-2 text-gray-500">
          Choose which company you&apos;re hiring for, or create a new one.
        </p>
      </header>

      {organizations.length > 0 ? (
        <div className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:150ms]">
          <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-3">
            Your companies
          </h2>
          <ul className="space-y-2 mb-10">
            {organizations.map((org) => (
              <li key={org.id}>
                <Link
                  href={"/new-listing/" + org.id}
                  className="card p-4 flex items-center gap-3 hover:shadow-card-hover hover:ring-swamp-200 group"
                >
                  <div className="size-10 rounded-xl bg-swamp-50 ring-1 ring-swamp-100 flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faBuilding}
                      className="text-swamp-500"
                    />
                  </div>
                  <span className="grow text-gray-900 font-medium">
                    {org.name}
                  </span>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="size-4 text-gray-300 group-hover:text-swamp-500 group-hover:translate-x-0.5 transition-all"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card p-8 text-center mb-10 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:150ms]">
          <p className="font-serif text-2xl text-gray-700 mb-1">
            No companies yet.
          </p>
          <p className="text-sm text-gray-500">
            Create your first company below to start posting roles.
          </p>
        </div>
      )}

      <div className="relative rounded-2xl bg-gradient-swamp p-[1px] shadow-swamp-glow opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:250ms]">
        <div className="rounded-2xl bg-white p-6 sm:flex items-center justify-between gap-6">
          <div>
            <h3 className="font-serif text-2xl text-gray-900">
              Hiring for a new company?
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Register it in seconds and start posting roles.
            </p>
          </div>
          <Link
            href="/new-company"
            className="btn-primary mt-4 sm:mt-0 shrink-0"
          >
            <FontAwesomeIcon icon={faPlus} className="size-3.5" />
            Create a new company
          </Link>
        </div>
      </div>
    </section>
  );
}
