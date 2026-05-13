"use client";

import { useTransition, useState } from "react";
import { markApplicationReviewed } from "@/app/actions/applicationActions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

export default function MarkReviewedButton({
  applicationId,
  status,
}: {
  applicationId: string;
  status: "new" | "reviewed";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "reviewed") {
    return (
      <span
        key="reviewed"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider text-gray-500 bg-gray-100 ring-1 ring-gray-200 motion-safe:animate-fade-in"
      >
        <FontAwesomeIcon icon={faCheck} className="size-3" />
        Reviewed
      </span>
    );
  }

  return (
    <div key="pending" className="flex flex-col items-end gap-1 motion-safe:animate-fade-in">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await markApplicationReviewed(applicationId);
            } catch (e: any) {
              setError(e?.message || "Could not mark as reviewed");
            }
          });
        }}
        className="btn-primary transition-all active:scale-[0.98]"
      >
        {isPending ? (
          <>
            <span className="inline-block size-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Marking…
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faCheck} className="size-3.5" />
            Mark as reviewed
          </>
        )}
      </button>
      {error && (
        <p className="font-mono text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
