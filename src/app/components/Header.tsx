import Link from "next/link";
import { getUser, getSignInUrl, signOut } from "@workos-inc/authkit-nextjs";
import HeaderShell from "./HeaderShell";

export default async function Header() {
  const { user } = await getUser();
  const signInUrl = await getSignInUrl();

  async function signOutAction() {
    "use server";
    await signOut();
  }

  return (
    <HeaderShell>
      <div className="container flex items-center justify-between gap-3 sm:gap-6 py-3 sm:py-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="size-2.5 rounded-full bg-swamp-500" />
          <span className="font-serif text-xl sm:text-2xl tracking-tight text-gray-900">
            marshland<span className="text-swamp-500">.</span>
          </span>
        </Link>

        <nav className="flex items-center text-sm">
          <Link
            href="/jobs"
            className="inline-flex items-center min-h-[44px] px-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Jobs
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!user && (
            <Link
              href={signInUrl}
              className="inline-flex items-center justify-center min-h-[44px] px-4 sm:px-5 py-2 rounded-full font-medium text-sm text-swamp-700 bg-white border-2 border-swamp-600 transition-all duration-200 hover:bg-swamp-50 hover:border-swamp-700"
            >
              Sign in
            </Link>
          )}
          {user && (
            <>
              <span
                className="hidden md:inline-block max-w-[180px] truncate text-xs font-mono text-gray-400"
                title={user.email ?? undefined}
              >
                {user.email}
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center min-h-[44px] px-2 sm:px-3 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Sign out
                </button>
              </form>
              <Link href="/new-listing" className="btn-primary text-sm">
                Post a job
              </Link>
            </>
          )}
        </div>
      </div>
    </HeaderShell>
  );
}
