import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

type PageProps = {
  params: { jobId: string };
};

export default function ApplySuccessPage({ params }: PageProps) {
  return (
    <div className="container max-w-md text-center py-24">
      <div className="size-16 mx-auto rounded-2xl bg-swamp-50 ring-1 ring-swamp-200 flex items-center justify-center mb-6 motion-safe:animate-pop-in">
        <FontAwesomeIcon icon={faCheck} className="text-swamp-500 text-2xl" />
      </div>
      <p className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:120ms]">
        Application received
      </p>
      <h1 className="font-serif text-3xl text-gray-900 mb-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:200ms]">
        We&apos;ve got it from here.
      </h1>
      <p className="text-gray-500 mb-8 leading-relaxed opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:280ms]">
        Your application has been sent to the hiring team. If they want to move
        forward, you&apos;ll hear from them by email or phone.
      </p>
      <div className="flex items-center justify-center gap-3 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:360ms]">
        <Link href={`/show/${params.jobId}`} className="btn-ghost">
          Back to job
        </Link>
        <Link href="/" className="btn-primary">
          Browse more roles
        </Link>
      </div>
    </div>
  );
}
