import Link from "next/link";

export default function JobNotFound() {
  return (
    <div className="container text-center py-24">
      <p className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]">
        404
      </p>
      <h1 className="font-serif text-4xl text-gray-900 mb-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:130ms]">
        Job not found
      </h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:210ms]">
        The job listing you are looking for does not exist or has been removed.
      </p>
      <div className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:290ms]">
        <Link href="/" className="btn-primary">
          Browse all jobs
        </Link>
      </div>
    </div>
  );
}
