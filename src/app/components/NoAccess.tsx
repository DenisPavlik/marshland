import Link from "next/link";

export default function NoAccess({
  text,
  action,
}: {
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="container text-center py-24">
      <p className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]">
        Access denied
      </p>
      <h1 className="font-serif text-3xl text-gray-900 max-w-md mx-auto leading-tight opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:150ms]">
        {text}
      </h1>
      <div className="mt-8 flex items-center justify-center gap-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:250ms]">
        {action}
        <Link href="/jobs" className="btn-ghost">
          Browse all jobs
        </Link>
      </div>
    </div>
  );
}
