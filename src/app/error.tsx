"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container text-center py-24">
      <p className="font-mono text-xs uppercase tracking-wider text-red-500 mb-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]">
        Something broke
      </p>
      <h1 className="font-serif text-4xl text-gray-900 mb-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:150ms]">
        We hit a snag.
      </h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:250ms]">
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="flex items-center justify-center gap-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:350ms]">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Return home
        </Link>
      </div>
    </div>
  );
}
