import { getUser, getSignInUrl } from "@workos-inc/authkit-nextjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { createCompany } from "../actions/workosActions";
import NoAccess from "../components/NoAccess";

export default async function NewCompanyPage() {
  const { user } = await getUser();
  if (!user) {
    const signInUrl = await getSignInUrl();
    return (
      <NoAccess
        text="You need to be logged in to create a company."
        action={
          <Link href={signInUrl} className="btn-primary">
            Sign in
          </Link>
        }
      />
    );
  }

  async function handleNewCompanyFormSubmit(data: FormData) {
    "use server";
    await createCompany(data.get("newCompanyName") as string);
  }

  return (
    <section className="container max-w-xl py-16">
      <Link
        href="/new-listing"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-8"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
        Back to companies
      </Link>

      <header className="mb-8 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]">
        <h1 className="font-serif text-4xl text-gray-900">Create a company</h1>
        <p className="mt-2 text-gray-500">
          To post a role, you first need to register the company that&apos;s
          hiring.
        </p>
      </header>

      <form action={handleNewCompanyFormSubmit} className="space-y-4">
        <div className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:150ms]">
          <label
            htmlFor="newCompanyName"
            className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-2"
          >
            Company name
          </label>
          <input
            id="newCompanyName"
            type="text"
            name="newCompanyName"
            required
            minLength={2}
            maxLength={100}
            placeholder="Acme Inc."
            className="input-base"
          />
        </div>
        <div className="flex justify-end pt-2 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:230ms]">
          <button type="submit" className="btn-primary">
            Create company
          </button>
        </div>
      </form>
    </section>
  );
}
